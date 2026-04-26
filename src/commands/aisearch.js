import { SlashCommandBuilder } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('aisearch')
        .setDescription('Thorough AI-powered deep search for products and info')
        .addStringOption((option) =>
            option.setName('query').setDescription('What are you looking for?').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('limit').setDescription('Number of results (1-5)').setRequired(false)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');
        const limit = (isInteraction ? context.options.getInteger('limit') : 5) || 5;

        if (!query) {
            const msg = await t('commands.aisearch.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const response = await APIClient.post('/ai/alpha/search', { query, limit, lang });
            const results = response.results || [];
            const aiSummary = response.ai_summary;

            if (results.length === 0 && !aiSummary) {
                const noResultsMsg = await t('commands.aisearch.no_results', { query }, guildId);
                return isInteraction
                    ? context.editReply(noResultsMsg)
                    : context.reply(noResultsMsg);
            }

            const user = isInteraction ? context.user : context.author;
            const embed = new OpenZeroEmbed()
                .setStandardLayout(user, '/aisearch', `AI Search (Brave): ${query}`)
                .setAISummary(aiSummary);

            if (results.length > 0) {
                for (const [i, r] of results.entries()) {
                    embed.addFields({
                        name: `${i + 1}. ${r.title}`,
                        value: `${r.snippet.substring(0, 300)}... [Link](${r.url})`,
                    });
                }
            }

            embed.setFooter({ text: await t('commands.aisearch.footer', {}, guildId) });

            return isInteraction
                ? context.editReply({ embeds: [embed] })
                : context.reply({ embeds: [embed] });
        } catch (error) {
            Logger.error('AI Search command error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
