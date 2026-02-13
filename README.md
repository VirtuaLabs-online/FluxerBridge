# Discord → Fluxer Message Bridge

A simple, lightweight bot that forwards messages from a Discord channel to a Fluxer channel in real-time.

## Features

✅ **Multi-channel support** - Bridge multiple Discord channels to multiple Fluxer channels
✅ **Directional control** - Choose Discord→Fluxer, Fluxer→Discord, or bidirectional for each channel
✅ **One-way or two-way** - Mix and match directions per channel
✅ **Username display** - Shows who sent the message
✅ **Timestamp support** - Displays when messages were sent
✅ **Embed forwarding** - Passes through embeds in both directions
✅ **Attachment links** - Links to attachments
✅ **Bot message filtering** - Prevents loops and spam
✅ **Error handling** - Graceful rate limit handling

## Prerequisites

* **Node.js 18+** installed
* A **Discord bot** with Message Content Intent enabled
* A **Fluxer bot** token
* Channel IDs for both platforms

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
FLUXER_BOT_TOKEN=your_fluxer_bot_token_here

# Channel Mappings with direction control
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:both
CHANNEL_MAPPING_2=111111111111111111:222222222222222222:d2f
CHANNEL_MAPPING_3=333333333333333333:444444444444444444:f2d
```

**Channel Mapping Format:**

* `CHANNEL_MAPPING_N=<discord_id>:<fluxer_id>:<direction>`
* **Direction options:**

  * `d2f` = Discord → Fluxer (one-way)
  * `f2d` = Fluxer → Discord (one-way)
  * `both` = Bidirectional (↔)
* The number (N) should increment: 1, 2, 3, 4, etc.
* You can bridge as many channels as you want
* Each mapping can have its own direction

### 3. Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application (or select existing)
3. Go to **Bot** section:

   * Click **Reset Token** to get your bot token
   * Enable **Message Content Intent** under Privileged Gateway Intents
4. Go to **OAuth2 → URL Generator**:

   * Select scopes: `bot`
   * Select permissions: `Read Messages/View Channels`, `Read Message History`
   * Copy the generated URL and invite the bot to your server

### 4. Set Up Fluxer Bot

1. Open Fluxer ([web.fluxer.app](https://web.fluxer.app) or desktop app)
2. Click the cogwheel (bottom-left) → **User Settings** → **Applications**
3. Create a new application
4. Copy the bot token
5. Invite the bot to your Fluxer guild/server

### 5. Get Channel IDs

**Discord:**

1. Enable Developer Mode: User Settings → Advanced → Developer Mode
2. Right-click the channel you want to bridge
3. Click "Copy Channel ID"

**Fluxer:**

1. Right-click the channel in Fluxer
2. Copy the channel ID (or check the URL when viewing the channel)

### 6. Run the Bridge

```bash
npm start
```

You should see:

```
🚀 Starting Discord ↔ Fluxer Bridge...

📡 Connecting to Fluxer gateway...
✅ Fluxer bot connected successfully

🤖 Discord bot logged in as YourBot#1234
📡 Active channel bridges (3):
   1. Discord 123456789012345678 ↔ Fluxer 987654321098765432 [both]
   2. Discord 111111111111111111 → Fluxer 222222222222222222 [d2f]
   3. Discord 333456789012345678 ← Fluxer 444444444444444444 [f2d]
✅ Bridge is active!
```

The arrows show the direction:

* `→` = Discord to Fluxer only
* `←` = Fluxer to Discord only
* `↔` = Bidirectional

## Message Format

By default, messages appear in Fluxer like this:

```
**Username**: Message content here
*2 minutes ago*
```

### Customization

Edit the `CONFIG.formatting` section in `discord-fluxer-bridge.js`:

```javascript
formatting: {
  includeUsername: true,      // Show "**Username**: message"
  includeAvatar: false,       // Requires webhook setup
  timestampFormat: 'relative' // 'relative', 'absolute', or 'none'
}
```

## How It Works

1. Bot connects to both Discord and Fluxer gateways
2. Listens for new messages on ALL configured channels (both platforms)
3. Filters out bot messages (prevents loops)
4. Checks the direction setting for the channel
5. Routes messages according to direction:

   * `d2f`: Discord → Fluxer only
   * `f2d`: Fluxer → Discord only
   * `both`: Messages flow in both directions
6. Formats the message with username and timestamp
7. Sends to the destination platform
8. Handles rate limits gracefully

## Multi-Channel Setup Examples

### Example 1: Full Bidirectional Mirror

```env
# Complete two-way sync - messages flow both directions
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:both  # general ↔ general
CHANNEL_MAPPING_2=234567890123456789:876543210987654321:both  # memes ↔ memes
CHANNEL_MAPPING_3=345678901234567890:765432109876543210:both  # support ↔ help
```

### Example 2: Announcement Distribution

```env
# Announcements flow from Discord to Fluxer only
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:d2f  # discord-announcements → fluxer-news
CHANNEL_MAPPING_2=234567890123456789:987654321098765432:d2f  # discord-updates → fluxer-news
# Consolidate multiple Discord channels to one Fluxer channel
```

### Example 3: Community Feedback System

```env
# Users can suggest on Fluxer, team responds on Discord
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:f2d  # discord-team ← fluxer-suggestions
CHANNEL_MAPPING_2=234567890123456789:876543210987654321:d2f  # discord-announcements → fluxer-updates
```

### Example 4: Mixed Directions

```env
# Different channels have different sync strategies
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:both  # general: bidirectional
CHANNEL_MAPPING_2=234567890123456789:876543210987654321:d2f   # announcements: Discord→Fluxer
CHANNEL_MAPPING_3=345678901234567890:765432109876543210:f2d   # feedback: Fluxer→Discord
CHANNEL_MAPPING_4=456789012345678901:654321098765432109:both  # support: bidirectional
```

### Example 5: Migration Helper

```env
# Transitioning from Discord to Fluxer
CHANNEL_MAPPING_1=123456789012345678:987654321098765432:both  # Keep both active during transition
CHANNEL_MAPPING_2=234567890123456789:876543210987654321:d2f   # Archive old Discord messages to Fluxer
```

## Troubleshooting

### "Missing required environment variables"

* Make sure your `.env` file exists and contains all four variables
* Check that there are no typos in variable names

### "Missing Access" error on Discord

* Ensure the bot has `Read Messages` and `Read Message History` permissions
* Check that the bot is in the same server as the channel

### "Unknown Channel" error on Fluxer

* Verify the Fluxer bot is in the same guild/server
* Double-check the channel ID is correct

### Messages not forwarding

* Check the console for error messages
* Verify the Discord bot has "Message Content Intent" enabled
* Ensure both bots are actually in the channels

### Rate limiting (HTTP 429)

* The bot will log when rate limited
* It will tell you how long to wait
* For high-volume channels, consider implementing a queue

## Advanced Usage

### Using Webhooks (Better Formatting)

For a cleaner appearance with user avatars, use Fluxer webhooks instead of a bot:

1. Create a webhook in Fluxer channel settings
2. Modify the code to use webhook endpoint instead of bot messages
3. Pass `username` and `avatar_url` in the payload

### Attachment Downloading

To actually re-upload attachments (not just link):

1. Download files from Discord/Fluxer CDN
2. Upload to destination platform using multipart/form-data
3. Watch file size limits (25 MiB free, 500 MiB premium on Fluxer)

### Per-Channel Formatting

Add different formatting rules for different channels:

1. Create a formatting map in the config
2. Apply different username styles or timestamp formats
3. Customize embed handling per channel pair

## File Structure

```
discord-fluxer-bridge/
├── discord-fluxer-bridge.js  # Main bot code
├── package.json              # Dependencies
├── .env                      # Your secrets (not committed)
├── .env.example              # Template for .env
└── README.md                 # This file
```

## Security Notes

⚠️ **Never commit your `.env` file to version control!**

Add to your `.gitignore`:

```
.env
node_modules/
```

## Contributing

Feel free to fork and improve! Some ideas:

* [ ] Add support for message edits/deletes sync
* [ ] Implement attachment re-uploading
* [ ] Add webhook support for better formatting
* [ ] Create a web dashboard for configuration
* [ ] Add message filtering/transformation rules per channel
* [ ] Implement message ID tracking for edit/delete sync
* [ ] Add rate limit queuing for high-volume channels
* [ ] Support thread/forum channel bridging
* [ ] Add reaction syncing between platforms

## License

License

Shield: [![CC BY-NC 4.0][cc-by-nc-shield]][cc-by-nc]

This work is licensed under a
[Creative Commons Attribution-NonCommercial 4.0 International License][cc-by-nc].

[![CC BY-NC 4.0][cc-by-nc-image]][cc-by-nc]

[cc-by-nc]: https://creativecommons.org/licenses/by-nc/4.0/
[cc-by-nc-image]: https://licensebuttons.net/l/by-nc/4.0/88x31.png
[cc-by-nc-shield]: https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg

## Support

* [Fluxer Documentation](https://docs.fluxer.app/)
* [Discord.js Guide](https://discordjs.guide/)
* [Fluxer Developers Community](https://fluxer.gg/fluxer-developers)

---

Made with ❤️ for the Fluxer community
