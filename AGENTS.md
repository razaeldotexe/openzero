# Agent Context: open-0

## Project Type
Discord Bot (Modular Command Handler)

## Framework & Language
- Discord.js v14
- Node.js (ES Modules)
- Python (API fetcher helpers in `/API`)

## Architecture
- Single entry point: `index.js`
- Commands are auto-loaded from `commands/` folder
- Each command exports: `{ name, description, execute(message, args) }`
- Environment variables: `DISCORD_TOKEN` via dotenv

## Available Commands
- `!ping` - Bot responsiveness check
- `!wikipedia <query>` - Search Wikipedia
- `!openlibrary <query>` - Search books
- `!arxiv <query>` - Search academic papers

## Notes
- Prefix: `!`
- Intents required: Guilds, GuildMessages, MessageContent
- Bot activity text: ".help | All endpoints have been collected."
