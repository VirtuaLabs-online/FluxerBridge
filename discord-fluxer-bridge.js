import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Client as FluxerClient, GatewayDispatchEvents } from '@discordjs/core';
import { WebSocketManager } from '@discordjs/ws';

// ============================================
// CONFIGURATION
// ============================================

function loadConfig() {
    const configPath = resolve(process.cwd(), 'config.json');

    if (!existsSync(configPath)) {
        console.error('❌ config.json not found!');
        console.error('   Create a config.json next to bridge.js. Example:');
        console.error(JSON.stringify({
            mappings: [
                {
                    discordId: "123456789012345678",
                    fluxerId: "987654321098765432",
                    direction: "both",
                    label: "my-channel",
                    allowCrossposts: true,
                    formatting: {
                        includeUsername: true,
                        includeAvatar: true,
                        timestampFormat: "none"
                    }
                }
            ],
            defaultFormatting: {
                includeUsername: false,
                includeAvatar: false,
                timestampFormat: "none"
            }
        }, null, 2));
        process.exit(1);
    }

    let raw;
    try {
        raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (err) {
        console.error('❌ config.json is not valid JSON:', err.message);
        process.exit(1);
    }

    if (!Array.isArray(raw.mappings) || raw.mappings.length === 0) {
        console.error('❌ config.json must have a non-empty "mappings" array.');
        process.exit(1);
    }

    const VALID_DIRECTIONS = ['d2f', 'f2d', 'both'];
    const VALID_TIMESTAMPS = ['none', 'relative', 'absolute'];

    const defaultFormatting = {
        includeUsername: false,
        includeAvatar: false,
        timestampFormat: 'none',
        ...(raw.defaultFormatting ?? {})
    };

    const mappings = raw.mappings.map((m, i) => {
        const label = `mappings[${i}]${m.label ? ` ("${m.label}")` : ''}`;

        if (!m.discordId || typeof m.discordId !== 'string') {
            console.error(`❌ ${label}: missing or invalid "discordId"`); process.exit(1);
        }
        if (!m.fluxerId || typeof m.fluxerId !== 'string') {
            console.error(`❌ ${label}: missing or invalid "fluxerId"`); process.exit(1);
        }

        const direction = m.direction ?? 'd2f';
        if (!VALID_DIRECTIONS.includes(direction)) {
            console.warn(`⚠️  ${label}: invalid direction "${direction}", falling back to "d2f"`);
        }

        const fmt = { ...defaultFormatting, ...(m.formatting ?? {}) };
        if (!VALID_TIMESTAMPS.includes(fmt.timestampFormat)) {
            console.warn(`⚠️  ${label}: invalid timestampFormat "${fmt.timestampFormat}", falling back to "none"`);
            fmt.timestampFormat = 'none';
        }

        return {
            discordId:        m.discordId.trim(),
            fluxerId:         m.fluxerId.trim(),
            direction:        VALID_DIRECTIONS.includes(direction) ? direction : 'd2f',
            label:            m.label ?? null,
            allowCrossposts:  Boolean(m.allowCrossposts ?? false),
            formatting: {
                includeUsername: Boolean(fmt.includeUsername),
                includeAvatar:   Boolean(fmt.includeAvatar),
                timestampFormat: fmt.timestampFormat,
            }
        };
    });

    return { mappings, defaultFormatting };
}

const CONFIG = loadConfig();

const discordToFluxer = new Map();
const fluxerToDiscord = new Map();

CONFIG.mappings.forEach(m => {
    if (m.direction === 'd2f' || m.direction === 'both') {
        discordToFluxer.set(m.discordId, { 
            fluxerId: m.fluxerId, 
            formatting: m.formatting,
            allowCrossposts: m.allowCrossposts
        });
    }
    if (m.direction === 'f2d' || m.direction === 'both') {
        fluxerToDiscord.set(m.fluxerId, { 
            discordId: m.discordId, 
            formatting: m.formatting
        });
    }
});

// ============================================
// FLUXER CLIENT
// ============================================

const fluxerRest = new REST({
    api:               'https://api.fluxer.app',
    version:           '1',
    userAgentAppendix: 'DiscordFluxerBridge/1.0'
}).setToken(process.env.FLUXER_BOT_TOKEN);

const fluxerGateway = new WebSocketManager({
    token:   process.env.FLUXER_BOT_TOKEN,
    intents: 0,
    rest:    fluxerRest,
    version: '1',
});

const fluxerClient = new FluxerClient({ rest: fluxerRest, gateway: fluxerGateway });

// ============================================
// DISCORD CLIENT
// ============================================

const discordClient = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ============================================
// AVATAR URL HELPERS
// ============================================

/**
 * Build a Discord avatar URL from a discord.js User object.
 * Falls back to the default avatar if the user has none.
 * discord.js's displayAvatarURL() handles animated (a_) hashes automatically.
 */
function getDiscordAvatarUrl(user) {
    return user.displayAvatarURL({ size: 256, extension: 'png', forceStatic: false });
}

/**
 * Build a Fluxer avatar URL from a raw gateway user object.
 * Fluxer CDN: https://fluxerusercontent.com/avatars/{user_id}/{avatar_hash}.webp?size=256
 * Default:    https://fluxerstatic.com/avatars/{index}.png  (index = user_id % 6)
 */
function getFluxerAvatarUrl(user) {
    if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'webp';
        return `https://fluxerusercontent.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    }
    // Default avatar fallback
    const index = Number(BigInt(user.id) % 6n);
    return `https://fluxerstatic.com/avatars/${index}.png`;
}

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Build a timestamp suffix string for appending to content.
 */
function buildTimestampSuffix(createdTimestamp, isoTimestamp, timestampFormat) {
    if (timestampFormat === 'none') return '';

    const ts = createdTimestamp != null
        ? Math.floor(createdTimestamp / 1000)
        : isoTimestamp ? Math.floor(new Date(isoTimestamp).getTime() / 1000) : null;

    if (ts == null) return '';
    return timestampFormat === 'relative' ? `\n*<t:${ts}:R>*` : `\n*<t:${ts}:F>*`;
}

/**
 * Append attachment links to a content string.
 */
function appendAttachments(baseContent, attachments) {
    if (!attachments?.length) return baseContent;
    const links = attachments.map(a => `[${a.filename ?? a.name}](${a.url})`).join('\n');
    return `${baseContent}\n\n📎 Attachments:\n${links}`;
}

/**
 * Build the final message payload for forwarding.
 *
 * With includeAvatar=true:
 *   → Sends an embed with the user's avatar as the author icon.
 *     The message content moves into the embed description.
 *     Any existing embeds are appended after.
 *
 * With includeAvatar=false, includeUsername=true:
 *   → Plain text with **username**: prefix.
 *
 * With both false:
 *   → Plain content only.
 */
function buildPayload({ username, avatarUrl, content, existingEmbeds, formatting, createdTimestamp, isoTimestamp, direction }) {
    const tsSuffix    = buildTimestampSuffix(createdTimestamp, isoTimestamp, formatting.timestampFormat);
    const fullContent = content + tsSuffix;

    if (formatting.includeAvatar) {
        const unixTs = createdTimestamp != null
            ? Math.floor(createdTimestamp / 1000)
            : isoTimestamp ? Math.floor(new Date(isoTimestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);

        let description;
        let embedTimestamp;

        if (direction === 'toDiscord') {
            // Discord renders the native embed timestamp field natively
            embedTimestamp = new Date(unixTs * 1000).toISOString();
            description    = fullContent || undefined;
        } else {
            // Fluxer doesn't render the embed timestamp field, inline it instead
            description = (fullContent ? fullContent + '\n' : '') + `-# <t:${unixTs}:f>`;
        }

        const avatarEmbed = {
            author: {
                name:     username,
                icon_url: avatarUrl,
            },
            description,
            timestamp: embedTimestamp,
            image: { url: 'https://groupsync.network/assets/embedforcewidth.png' },
        };

        return {
            content:   '',
            embeds:    [avatarEmbed, ...(existingEmbeds ?? [])],
        };
    }

    // Text-only mode
    const prefix = formatting.includeUsername ? `**${username}**: ` : '';
    return {
        content: prefix + fullContent,
        embeds:  existingEmbeds?.length ? existingEmbeds : undefined,
    };
}

/**
 * Convert discord.js embed objects to plain API-compatible objects for Fluxer.
 */
function convertEmbeds(discordEmbeds) {
    return discordEmbeds.map(embed => ({
        title:       embed.title,
        description: embed.description,
        url:         embed.url,
        color:       embed.color,
        fields:      embed.fields,
        footer:      embed.footer,
        timestamp:   embed.timestamp,
        image:       embed.image,
        thumbnail:   embed.thumbnail,
        author:      embed.author,
    }));
}

// ============================================
// SEND HELPERS
// ============================================

async function sendToFluxer(fluxerChannelId, payload) {
    try {
        await fluxerClient.api.channels.createMessage(fluxerChannelId, payload);
        console.log(`✓ → Fluxer #${fluxerChannelId}`);
    } catch (error) {
        console.error(`✗ Failed to send to Fluxer #${fluxerChannelId}:`, error.message);
        if (error.status === 429) console.error('  Rate limited! Retry after:', error.headers?.['retry-after']);
    }
}

async function sendToDiscord(discordChannelId, payload) {
    try {
        const channel = await discordClient.channels.fetch(discordChannelId);
        await channel.send(payload);
        console.log(`✓ → Discord #${discordChannelId}`);
    } catch (error) {
        console.error(`✗ Failed to send to Discord #${discordChannelId}:`, error.message);
        if (error.status === 429) console.error('  Rate limited! Retry after:', error.headers?.['retry-after']);
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

// Fluxer ready
fluxerClient.on(GatewayDispatchEvents.Ready, ({ data }) => {
    console.log(`✅ Fluxer bot connected as ${data.user.username}\n`);
});

// Fluxer → Discord
fluxerClient.on(GatewayDispatchEvents.MessageCreate, async ({ data: message }) => {
    const route = fluxerToDiscord.get(message.channel_id);
    if (!route) return;
    if (message.author.bot) return;
    if (!message.content && !message.embeds?.length && !message.attachments?.length) return;

    console.log(`📨 [Fluxer ${message.channel_id} → Discord ${route.discordId}] ${message.author.username}: ${message.content?.substring(0, 50)}`);

    const avatarUrl = getFluxerAvatarUrl(message.author);
    const attachments = message.attachments ?? [];

    const payload = buildPayload({
        username:          message.author.username,
        avatarUrl,
        content:           appendAttachments(message.content ?? '', attachments),
        existingEmbeds:    message.embeds,
        formatting:        route.formatting,
        createdTimestamp:  null,
        isoTimestamp:      message.timestamp,
        direction:         'toDiscord',
    });

    await sendToDiscord(route.discordId, payload);
});

// Discord ready
discordClient.on('clientReady', () => {
    console.log(`🤖 Discord bot logged in as ${discordClient.user.tag}`);
    console.log(`📡 Active bridges (${CONFIG.mappings.length}):`);
    CONFIG.mappings.forEach((m, i) => {
        const arrow = m.direction === 'd2f' ? '→' : m.direction === 'f2d' ? '←' : '↔';
        const label = m.label ? ` [${m.label}]` : '';
        const fmt   = `username=${m.formatting.includeUsername}, avatar=${m.formatting.includeAvatar}, ts=${m.formatting.timestampFormat}`;
        const xpost = m.allowCrossposts ? ', crossposts=✓' : '';
        console.log(`   ${i + 1}. Discord ${m.discordId} ${arrow} Fluxer ${m.fluxerId}${label} (${fmt}${xpost})`);
    });
    console.log('✅ Bridge is active!\n');
});

// Discord → Fluxer
discordClient.on('messageCreate', async (message) => {
    const route = discordToFluxer.get(message.channelId);
    if (!route) return;
    
    // Check if this is a crosspost (followed announcement)
    const isCrosspost = message.flags?.has('IsCrosspost');
    
    // Filter out bot messages unless they're crossposts AND crossposts are allowed
    if (message.author.bot) {
        if (!isCrosspost || !route.allowCrossposts) {
            return;
        }
    }
    
    if (!message.content && message.embeds.length === 0 && message.attachments.size === 0) return;

    const msgType = isCrosspost ? '[CROSSPOST] ' : '';
    console.log(`📨 ${msgType}[Discord ${message.channelId} → Fluxer ${route.fluxerId}] ${message.author.username}: ${message.content.substring(0, 50)}`);

    const avatarUrl   = getDiscordAvatarUrl(message.author);
    const attachments = Array.from(message.attachments.values()).map(a => ({ name: a.name, url: a.url }));

    const payload = buildPayload({
        username:         message.author.username,
        avatarUrl,
        content:          appendAttachments(message.content, attachments),
        existingEmbeds:   message.embeds.length > 0 ? convertEmbeds(message.embeds) : [],
        formatting:       route.formatting,
        createdTimestamp: message.createdTimestamp,
        isoTimestamp:     null,
        direction:        'toFluxer',
    });

    await sendToFluxer(route.fluxerId, payload);
});

discordClient.on('error', (error) => console.error('Discord client error:', error));

// ============================================
// STARTUP
// ============================================

function validateEnv() {
    const missing = [];
    if (!process.env.DISCORD_BOT_TOKEN) missing.push('DISCORD_BOT_TOKEN');
    if (!process.env.FLUXER_BOT_TOKEN)  missing.push('FLUXER_BOT_TOKEN');
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        process.exit(1);
    }
}

async function start() {
    console.log('🚀 Starting Discord ↔ Fluxer Bridge...\n');
    validateEnv();

    console.log('📡 Connecting to Fluxer gateway...');
    fluxerGateway.connect();

    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
}

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down bridge...');
    discordClient.destroy();
    fluxerGateway.destroy();
    process.exit(0);
});

start();