import { SlashCommandBuilder } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('appcheck')
        .setDescription('Check if an app or game is available on Mobile, PC, or Console')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('App name or Store URL (Play Store, App Store, etc.)')
                .setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let query;
        if (isInteraction) {
            query = context.options.getString('query');
        } else {
            query = args.join(' ');
        }

        if (!query) {
            const queryReq = await t('commands.appcheck.query_required', {}, guildId);
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(queryReq);
            return context.reply({ embeds: [embed] });
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            const loadingText = await t('commands.appcheck.searching', {}, guildId);
            const embed = new OpenZeroEmbed({}, context).setDescription(loadingText);
            loadingMsg = await context.reply({ embeds: [embed] });
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            const data = await APIClient.post('/ai/app-availability', {
                query: query,
            });

            if (data.error) {
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(data.error);
                return await editResponse({ embeds: [embed] });
            }

            if (!data.platforms || data.platforms.length === 0) {
                const noResults = await t('commands.appcheck.no_results', { query }, guildId);
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(noResults);
                return await editResponse({ embeds: [embed] });
            }

            const categories = {
                Mobile: [],
                PC: [],
                Console: [],
            };

            data.platforms.forEach((p) => {
                const cat = p.category || 'Mobile';
                if (categories[cat]) {
                    categories[cat].push(p);
                } else {
                    categories['Mobile'].push(p);
                }
            });

            const embed = new OpenZeroEmbed({}, context)
                .setAuthor({
                    name: await t(
                        'commands.appcheck.requested_by',
                        { username: user.username },
                        guildId
                    ),
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                })
                .setTitle(
                    await t('commands.appcheck.availability_for', { app: data.app_name }, guildId)
                );

            // Add Fields by Category
            if (categories['Mobile'].length > 0) {
                embed.addFields({
                    name: await t('commands.appcheck.category_mobile', {}, guildId),
                    value: categories['Mobile']
                        .map((p) => `> • **${p.name}**: [Link](${p.url})`)
                        .join('\n'),
                });
            }

            if (categories['PC'].length > 0) {
                embed.addFields({
                    name: await t('commands.appcheck.category_pc', {}, guildId),
                    value: categories['PC']
                        .map((p) => `> • **${p.name}**: [Link](${p.url})`)
                        .join('\n'),
                });
            }

            if (categories['Console'].length > 0) {
                embed.addFields({
                    name: await t('commands.appcheck.category_console', {}, guildId),
                    value: categories['Console']
                        .map((p) => `> • **${p.name}**: [Link](${p.url})`)
                        .join('\n'),
                });
            }

            await editResponse({ content: null, embeds: [embed] });
        } catch (error) {
            Logger.error('AppCheck Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(errorText);
            await editResponse({ embeds: [embed] });
        }
    },
};
