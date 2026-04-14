import 'dotenv/config';
import { Client, GatewayIntentBits, Events, ActivityType, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = '!';
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = pathToFileURL(path.join(commandsPath, file)).href;
        const { default: command } = await import(filePath);

        if (command && command.name) {
            client.commands.set(command.name, command);
            Logger.info(`Loaded command: ${command.name}`);

            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach((alias) => {
                    client.commands.set(alias, command);
                });
            }
        } else {
            Logger.warn(`Skip file: ${file} (missing name)`);
        }
    } catch (error) {
        Logger.error(`Error loading command from ${file}`, error);
    }
}

client.once(Events.ClientReady, (readyClient) => {
    Logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);

    readyClient.user.setActivity('!help | Searching Open Data', {
        type: ActivityType.Playing,
    });
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        Logger.error(`Error executing ${commandName}:`, error);
        message.reply('An error occurred while executing that command.');
    }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
    Logger.error('Failed to login:', error);
});
