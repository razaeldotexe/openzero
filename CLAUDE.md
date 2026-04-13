# Project Context: open-0

## Overview
A modular **Discord Bot** built with **Discord.js v14** using a **Modular Command Handler** structure and **ES Modules (ESM)**.

## Tech Stack
- **Runtime:** Node.js (v16.11.0+)
- **Framework:** Discord.js v14
- **Module System:** ES Modules (`"type": "module"`)
- **Environment:** dotenv
- **Linting/Formatting:** ESLint + Prettier

## Project Structure
```
openzero/
├── index.js              # Main entry point, command handler, event listeners
├── commands/             # Modular command files
│   ├── ping.js
│   ├── wikipedia.js
│   ├── openlibrary.js
│   └── arxiv.js
├── API/                  # Python API fetcher scripts
│   ├── wiki_fetcher.py
│   └── arxiv_fetcher.py
├── .env.example          # Environment template
└── package.json
```

## Key Details
- **Prefix:** `!`
- **Required Intents:** Guilds, GuildMessages, MessageContent
- **Adding Commands:** Create a `.js` file in `/commands/` exporting a default object with `name`, `description`, and `execute(message, args)`.

## External APIs
- **Wikipedia** - Info search with page navigation
- **Open Library** - Book collection search
- **arXiv** - Academic paper search

## Commands
- `npm start` - Run bot
- `npm run dev` - Run with nodemon
- `npm test` - Run tests
- `npm run lint` / `npm run format` - Code quality
