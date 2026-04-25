# Agent Context: openzero

## Project Type

Discord Bot (Modular Command Handler)

## Status

**ALL COMMANDS REMOVED.** The bot is currently in System Standby.

## Framework & Language

- Discord.js v14
- Node.js (ES Modules)

## Architecture

- Single entry point: `index.js`
- Commands are auto-loaded from `commands/` folder (Currently Empty)
- Each command exports: `{ name, description, execute(message, args) }`
- Environment variables: `DISCORD_TOKEN` via dotenv

## Commands

- `npm start` - Run bot
- `npm run dev` - Run with nodemon
- `npm run deploy` - Clear all Discord slash commands
- `npm run build` - Build bot (includes command clearing)
- `npm test` - Run tests
- `npm run lint` / `npm run format` - Code quality

## Notes

- Prefix: `!`
- Intents required: Guilds, GuildMessages, MessageContent
- Bot activity text: "System standby"
