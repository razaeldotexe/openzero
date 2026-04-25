import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import Logger from './utils/logger.js';

// Construct and prepare an instance of the REST module
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    Logger.error(
        '[Deploy] Missing required environment variables (DISCORD_TOKEN or CLIENT_ID). Please check your Railway environment variables or .env file.'
    );
    process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

// Clear all commands
(async () => {
    try {
        Logger.info('Started clearing all application (/) commands.');

        // Passing an empty array to body will clear all existing commands
        if (GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
                body: [],
            });
            Logger.info(
                `Successfully cleared all application (/) commands from guild ${GUILD_ID}.`
            );
        } else {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
            Logger.info('Successfully cleared all global application (/) commands.');
        }
    } catch (error) {
        Logger.error('[Deploy] Error clearing commands:', error);
    }
})();
