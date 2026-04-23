import { OpenZeroEmbed } from './embed.js';
import { APIClient } from '../API/api_client.js';
import { getMonitors, deleteMonitor } from './database.js';
import { t } from './i18n.js';
import Logger from './logger.js';

/**
 * Updates all active app monitors with fresh data.
 * @param {import('discord.js').Client} client
 */
export async function updateMonitors(client) {
    Logger.info('[Monitor] Starting daily update for app monitors...');
    const monitors = await getMonitors();

    if (monitors.length === 0) {
        Logger.info('[Monitor] No active monitors found.');
        return;
    }

    for (const monitor of monitors) {
        try {
            const guild = await client.guilds.fetch(monitor.guildId).catch(() => null);
            if (!guild) {
                Logger.warn(`[Monitor] Guild ${monitor.guildId} not found. Deleting monitor.`);
                await deleteMonitor(monitor.guildId, monitor.source);
                continue;
            }

            const channel = await guild.channels.fetch(monitor.channelId).catch(() => null);
            if (!channel) {
                Logger.warn(
                    `[Monitor] Channel ${monitor.channelId} not found in guild ${monitor.guildId}. Deleting monitor.`
                );
                await deleteMonitor(monitor.guildId, monitor.source);
                continue;
            }

            const message = await channel.messages.fetch(monitor.messageId).catch(() => null);
            if (!message) {
                Logger.warn(
                    `[Monitor] Message ${monitor.messageId} not found in channel ${monitor.channelId}. Deleting monitor.`
                );
                await deleteMonitor(monitor.guildId, monitor.source);
                continue;
            }

            // Fetch fresh data
            const apps = await APIClient.post('/apps/trending', {
                source: monitor.source,
                limit: 10,
            });

            if (!Array.isArray(apps) || apps.length === 0) continue;

            const guildId = monitor.guildId;
            const embed = new OpenZeroEmbed()
                .setTitle(`📈 Trending Apps: ${monitor.source.toUpperCase()}`)
                .setDescription(await t('commands.monitorapps.embed_desc', {}, guildId))
                .setFooter({ text: await t('commands.monitorapps.last_updated', {}, guildId) });

            const visitPageLabel = await t('commands.appsearch.visit_page', {}, guildId);

            apps.forEach((app, index) => {
                embed.addFields({
                    name: `${index + 1}. ${app.name}`,
                    value: `${app.summary || 'No description'}\n[${visitPageLabel}](${app.url})`,
                    inline: false,
                });
            });

            await message.edit({ embeds: [embed] });
            Logger.info(`[Monitor] Updated monitor for ${monitor.source} in ${monitor.guildId}`);
        } catch (error) {
            Logger.error(
                `[Monitor] Failed to update monitor for ${monitor.source} in ${monitor.guildId}:`,
                error
            );
        }
    }
    Logger.info('[Monitor] Daily update completed.');
}

/**
 * Initializes the monitoring task loop.
 */
export function initMonitorTask(client) {
    // Run every 24 hours
    // Initial delay: check if there's any monitor that needs updating (optional, let's just run every 24h)
    setInterval(() => updateMonitors(client), 24 * 60 * 60 * 1000);
}
