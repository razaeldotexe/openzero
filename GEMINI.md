# open-0

## What is this?
A modular Discord bot using Discord.js v14 with ES Modules. It provides commands for searching Wikipedia, Open Library, and arXiv directly from Discord.

## Stack
- Node.js + Discord.js v14 (ESM)
- dotenv for config
- ESLint + Prettier

## How it works
- `index.js` loads all `.js` files from `commands/` dynamically
- Commands use prefix `!`
- Requires MessageContent intent enabled in Discord Developer Portal

## Structure
- `commands/` - Discord bot commands
- `API/` - Python helper scripts for API fetching
