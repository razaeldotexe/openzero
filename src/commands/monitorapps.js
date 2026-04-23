import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import { saveMonitor, deleteMonitor } from '../utils/database.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('monitorapps')
        .setDescription('Send and monitor top trending apps in a specific channel')
        .addStringOption((option) =>
            option
                .setName('source')
                .setDescription('Source for trending apps')
                .setRequired(true)
                .addChoices(
                    { name: 'F-Droid', value: 'fdroid' },
                    { name: 'GitHub', value: 'github' }
                )
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to send the monitoring list to')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((option) =>
            option
                .setName('action')
                .setDescription('Start or stop monitoring')
                .setRequired(false)
                .addChoices({ name: 'Start', value: 'start' }, { name: 'Stop', value: 'stop' })
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const source = isInteraction ? context.options.getString('source') : args[0] || 'fdroid';
        const channel = isInteraction ? context.options.getChannel('channel') : context.channel;
        const action = isInteraction ? context.options.getString('action') || 'start' : 'start';

        if (action === 'stop') {
            await deleteMonitor(guildId, source);
            return context.reply({
                content: await t(
                    'commands.monitorapps.stop_success',
                    { source: source.toUpperCase() },
                    guildId
                ),
                ephemeral: true,
            });
        }

        if (isInteraction) await context.deferReply({ ephemeral: true });

        try {
            // Fetch initial trending data
            const apps = await APIClient.post('/apps/trending', {
                source: source,
                limit: 10,
            });

            if (!Array.isArray(apps) || apps.length === 0) {
                const noResults = await t(
                    'commands.monitorapps.no_results',
                    { source: source.toUpperCase() },
                    guildId
                );
                return isInteraction ? context.editReply(noResults) : context.reply(noResults);
            }

            const embed = new OpenZeroEmbed({}, context)
                .setTitle(`📈 Trending Apps: ${source.toUpperCase()}`)
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

            const monitorMsg = await channel.send({ embeds: [embed] });

            // Save to database
            await saveMonitor({
                guildId: guildId,
                channelId: channel.id,
                messageId: monitorMsg.id,
                source: source,
            });

            const successMsg = await t(
                'commands.monitorapps.start_success',
                { channel: channel.toString() },
                guildId
            );
            if (isInteraction) {
                await context.editReply(successMsg);
            } else {
                await context.reply(successMsg);
            }
        } catch (error) {
            Logger.error('MonitorApps Error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            if (isInteraction) {
                await context.editReply(errorMsg);
            } else {
                await context.reply(errorMsg);
            }
        }
    },
};
