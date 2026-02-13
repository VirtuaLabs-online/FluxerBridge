# Discord → Fluxer Message Bridge

A simple, lightweight bot that forwards messages between Discord and Fluxer channels using a JSON-based configuration.

## Features

✅ **Multi-channel support** - Bridge multiple Discord channels to multiple Fluxer channels
✅ **Directional control** - Choose Discord→Fluxer, Fluxer→Discord, or bidirectional per mapping
✅ **Per-channel formatting** - Customize username display, avatar, and timestamp
✅ **Embed forwarding** - Passes through embeds in both directions
✅ **Attachment links** - Includes attachments in messages
✅ **Bot message filtering** - Prevents loops
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

### 2. Create Your Config File

Create `config.json` in the root directory:

```json
{
  "mappings": [
    {
      "discordId": "123456789012345678",
      "fluxerId": "987654321098765432",
      "direction": "both",
      "label": "general",
      "formatting": {
        "includeUsername": true,
        "includeAvatar": false,
        "timestampFormat": "relative"
      }
    },
    {
      "discordId": "234567890123456789",
      "fluxerId": "876543210987654321",
      "direction": "d2f"
    }
  ],
  "defaultFormatting": {
    "includeUsername": false,
    "includeAvatar": false,
    "timestampFormat": "none"
  }
}
```

**Notes:**

* `direction`: `d2f`, `f2d`, or `both`
* `formatting` is optional; unspecified fields fall back to `defaultFormatting`
* `label` is optional for your reference

### 3. Configure Environment Variables

Create `.env`:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
FLUXER_BOT_TOKEN=your_fluxer_bot_token_here
```

### 4. Set Up Bots

Follow the same steps as before to configure Discord and Fluxer bots and invite them to the relevant channels.

### 5. Run the Bridge

```bash
npm start
```

The console will display connected channels, directions, and active bridge status.

## Message Formatting

Messages respect the `formatting` options per mapping. Example:

```
**Username**: Message content
*2 minutes ago*
```

* `includeUsername`: Shows sender name
* `includeAvatar`: Includes avatar in embed
* `timestampFormat`: `none`, `relative`, or `absolute`

## How It Works

1. Reads `config.json` for all mappings
2. Connects to both Discord and Fluxer
3. Listens for messages on configured channels
4. Filters bot messages
5. Routes messages according to `direction`
6. Formats messages per `formatting` settings
7. Sends to the destination platform
8. Handles rate limits

## Troubleshooting

* **Config errors**: Ensure `config.json` is valid JSON and has at least one mapping
* **Missing tokens**: `.env` must contain both bot tokens
* **Unknown channel**: Check IDs in `config.json` match actual channels
* **Message not forwarding**: Ensure bots have proper permissions

## File Structure

```
discord-fluxer-bridge/
├── discord-fluxer-bridge.js  # Main bot code
├── package.json               # Dependencies
├── .env                       # Your secrets (not committed)
├── config.json                # JSON configuration file
└── README.md                  # This file
```

## License

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
