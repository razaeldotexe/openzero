# OpenZero

<p align="center">
  <img src="./assets/openzero_full.png" width="600" alt="OpenZero Logo">
</p>

OpenZero is a modular research and development assistant Discord bot. It is designed to combine advanced AI reasoning with Open Data sources to provide a powerful tool for researchers, developers, and server administrators.

## Status

**Currently, all legacy commands have been removed to prepare for a core architectural update. The bot is in System Standby mode.**

## Technology Stack

- **Runtime:** Node.js v18+ (ES Modules)
- **Framework:** Discord.js v14
- **Backend API:** Flask (Python) for intensive data fetching.
- **Database:** MongoDB (for persistent tickets and settings).
- **AI Integration:** Multi-provider rotation (Gemini, Llama, Qwen, etc.).
- **Localization:** Custom i18n system integrated with **Crowdin**.

## Installation

1. Clone the repository.
2. Create a `.env` file based on `.env.example`.
3. Fill in the required tokens:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `GITHUB_TOKEN`
   - `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`
   - `MONGODB_URI`
   - `API_URL`
   - `APP_MODE` (`production` or `dev`)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Clear existing Slash Commands (Recommended):
   ```bash
   npm run deploy
   ```

## Railway Deployment

OpenZero is designed for easy deployment on **Railway**.
- **Worker Process:** The `Procfile` is configured to run the bot as a background worker.
- **Environment Variables:** Ensure all keys from `.env.example` are added to your Railway project settings.

---
*Help us translate OpenZero at [Crowdin](https://crowdin.com/project/openzero)*
