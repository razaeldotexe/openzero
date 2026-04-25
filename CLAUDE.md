# Project Context: openzero

## Overview

A modular **Discord Bot** built with **Discord.js v14** using a **Modular Command Handler** structure and **ES Modules (ESM)**.

**STATUS: All legacy commands have been removed. The bot is in standby.**

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Discord.js v14
- **Module System:** ES Modules (`"type": "module"`)
- **Environment:** dotenv
- **Linting/Formatting:** ESLint + Prettier

## Project Structure

```
openzero/
├── index.js              # Main entry point, command handler, event listeners
├── commands/             # Modular command files (Currently Empty)
├── API/                  # API managers
├── .env.example          # Environment template
└── package.json
```

## Key Details

- **Prefix:** `!`
- **Required Intents:** Guilds, GuildMessages, MessageContent
- **Commands:** No commands are currently active.

## Commands

- `npm start` - Run bot
- `npm run dev` - Run with nodemon
- `npm run deploy` - Clear all slash commands from Discord
- `npm test` - Run tests
- `npm run lint` / `npm run format` - Code quality
