# OpenZero

<p align="center">
  <img src="/assets/openzero_full.png" width="100" alt="OpenZero Logo">
</p>

OpenZero is a modular Discord bot designed as a research and development assistant. It connects users directly to various Open Data sources through simple text commands.

## Core Features

- **AI-Powered Tutorial Search (`!tutorial`)**: Scan the entire repository recursively and use AI (Gemini, Groq, or OpenRouter) to find the most relevant tutorial based on your query.
- **arXiv Search (`!arxiv`)**: Search for scientific papers in physics, mathematics, computer science, and more.
- **Wikipedia (`!wikipedia`)**: Get article summaries directly in Discord.
- **Open Library (`!openlibrary`)**: Access a catalog of millions of digital books.
- **Nerd Fonts (`!nerdfont`)**: Search and download developer fonts.

## Technology Stack

- **Node.js v18+** & **Discord.js v14** (ES Modules)
- **Python 3** (Helper API scripts)
- **AI Integration**: Gemini, Groq (Llama 3.1), and OpenRouter.

## Installation

1. Clone the repository.
2. Create a `.env` file based on `.env.example`.
3. Fill in the required tokens:
   - `DISCORD_TOKEN`
   - `GITHUB_TOKEN`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `OPENROUTER_API_KEY`
4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

- Start the bot:
  ```bash
  npm start
  ```
- Format the codebase (JavaScript and Python):
  ```bash
  npm run format
  ```

## Project Structure

- `src/index.js`: Main entry point.
- `src/commands/`: Discord command logic.
- `src/API/`: API management and data processing.
- `src/API/python/`: Python helper scripts for external data fetching.
- `src/utils/`: Utility functions and logging system.

## Logging System

The project uses a custom logging system located in `src/utils/logger.js`. It provides standardized timestamps and log levels (INFO, WARN, ERROR, DEBUG) for both the Node.js application and Python scripts.
