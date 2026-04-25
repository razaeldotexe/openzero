import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
    Collection,
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Logger from './utils/logger.js';
import { OpenZeroEmbed } from './utils/embed.js';
import { config } from './config.js';
import { t, setLanguage } from './utils/i18n.js';
import { detectLanguageWithAI } from './API/ai_manager.js';
import { SUPPORTED_LANGUAGES } from './utils/languages.js';
import {
    initDatabase,
    saveTicket,
    deleteTicket,
    getTicketsToCleanup,
    closeTicket,
} from './utils/database.js';
import { initMonitorTask } from './utils/monitor_task.js';

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
const cooldowns = new Collection();

const commandsPath = path.join(__dirname, 'commands');
let commandFiles = [];
if (fs.existsSync(commandsPath)) {
    commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
}

for (const file of commandFiles) {
    try {
        const filePath = pathToFileURL(path.join(commandsPath, file)).href;
        const { default: command } = await import(filePath);

        const commandName = command.data?.name || command.name;

        if (command && commandName) {
            client.commands.set(commandName, command);
            Logger.info(`Loaded command: ${commandName}`);

            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach((alias) => {
                    client.commands.set(alias, command);
                });
            }
        } else {
            Logger.warn(`Skip file: ${file} (missing command name or data)`);
        }
    } catch (error) {
        Logger.error(`Error loading command from ${file}`, error);
    }
}

client.once(Events.ClientReady, async (readyClient) => {
    Logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);
    Logger.info(`Bot is running in [${config.appMode.toUpperCase()}] mode.`);

    // Initialize Database
    await initDatabase();

    readyClient.user.setActivity('System standby', {
        type: ActivityType.Watching,
    });

    // Initialize monitoring task
    initMonitorTask(readyClient);

    // Background Task: Check for expired or closed tickets every 10 minutes
    setInterval(async () => {
        Logger.info('[Cleaner] Checking for tickets to clean up...');
        const cleanupTickets = await getTicketsToCleanup();

        // Use Promise.all for parallel processing of cleanup tickets
        await Promise.all(
            cleanupTickets.map(async (ticket) => {
                try {
                    const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
                    if (!guild) {
                        await deleteTicket(ticket.channelId);
                        return;
                    }

                    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
                    if (channel) {
                        const reason =
                            ticket.status === 'closed'
                                ? 'Ticket closed by user'
                                : 'Ticket expired (1 week)';
                        await channel
                            .delete(reason)
                            .catch((err) =>
                                Logger.error(`Failed to delete channel ${ticket.channelId}:`, err)
                            );
                    }
                    await deleteTicket(ticket.channelId);
                    Logger.info(`[Cleaner] Automatically cleaned up ticket: ${ticket.channelId}`);
                } catch (error) {
                    Logger.error(
                        `[Cleaner] Error processing cleanup ticket ${ticket.channelId}:`,
                        error
                    );
                }
            })
        );
    }, 600000); // 10 minutes
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // Mode Restriction: If in dev mode, only respond in specific channels
    if (config.appMode === 'dev') {
        const allowedChannels = config.allowedChannels || ['dev', 'debug', 'test'];
        const channelName = message.channel.name ? message.channel.name.toLowerCase() : '';
        const isAllowed = allowedChannels.some((name) => channelName.includes(name));

        if (!isAllowed) {
            return;
        }
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    const guildId = message.guild?.id;

    // Cooldown Logic
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            const cooldownMsg = await t('common.cooldown', { time: timeLeft.toFixed(1) }, guildId);
            return message.reply(cooldownMsg);
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Automatic Language Detection for input-based commands
    if (args.length > 0 && args.join(' ').length > 5) {
        try {
            const detectedLang = await detectLanguageWithAI(args.join(' '), SUPPORTED_LANGUAGES);

            if (detectedLang && guildId) {
                await setLanguage(guildId, detectedLang);
                const msg = await t(
                    'commands.language.auto_detected',
                    { lang: detectedLang },
                    guildId
                );
                Logger.info(msg);
            }
        } catch (error) {
            Logger.error('In-command language detection failed:', error);
        }
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        Logger.error(`Error executing ${commandName}:`, error);
        const errorMsg = await t('common.error', { error: error.message }, guildId);
        message.reply(errorMsg);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    const guildId = interaction.guild?.id;

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Cooldown Logic
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownMsg = await t(
                    'common.cooldown',
                    { time: timeLeft.toFixed(1) },
                    guildId
                );
                return interaction.reply({ content: cooldownMsg, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction);
        } catch (error) {
            Logger.error(`Error executing slash command ${interaction.commandName}:`, error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMsg, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
        return;
    }

    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    if (customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });

        const channelName = `ticket-${user.username}`.toLowerCase();

        // Check if ticket already exists
        const existingChannel = guild.channels.cache.find((c) => c.name === channelName);
        if (existingChannel) {
            const alreadyExistsMsg = await t(
                'commands.ticket.already_exists',
                {
                    channel: existingChannel.toString(),
                },
                guildId
            );
            return interaction.editReply({
                content: alreadyExistsMsg,
            });
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                        ],
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                        ],
                    },
                ],
            });

            const setupTitle = await t('commands.ticket.setup_title', {}, guildId);
            const createdMsg = await t(
                'commands.ticket.created_msg',
                { user: user.toString() },
                guildId
            );
            const closeBtnLabel = await t('commands.ticket.close_btn', {}, guildId);

            const embed = new OpenZeroEmbed()
                .setTitle(setupTitle)
                .setDescription(createdMsg)
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel(closeBtnLabel)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('')
            );

            await ticketChannel.send({ embeds: [embed], components: [row] });

            // Save Ticket to MongoDB
            await saveTicket({
                guildId: guild.id,
                channelId: ticketChannel.id,
                userId: user.id,
                username: user.username,
            });

            await interaction.editReply({
                content: `Ticket created: ${ticketChannel.toString()}`,
            });
        } catch (error) {
            Logger.error('Failed to create ticket channel:', error);
            await interaction.editReply({
                content: 'Failed to create ticket. Check bot permissions.',
            });
        }
    }

    if (customId === 'close_ticket') {
        const closingMsg = await t('commands.ticket.closing', {}, guildId);
        await interaction.reply({ content: closingMsg });

        // Mark as closed in database (background cleaner will handle the actual deletion if the immediate attempt fails)
        await closeTicket(interaction.channel.id);

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
    Logger.error('Failed to login:', error);
});
