import { SlashCommandBuilder } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('aisearch')
        .setDescription('AI-powered search for products and general info')
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
            const msg = await t('commands.product.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const products = await APIClient.post('/ai/search', { query, limit, lang });

            if (!Array.isArray(products) || products.length === 0) {
                const noResultsMsg = await t('commands.product.no_results', { query }, guildId);
                return isInteraction
                    ? context.editReply(noResultsMsg)
                    : context.reply(noResultsMsg);
            }

            const user = isInteraction ? context.user : context.author;
            const embed = new OpenZeroEmbed({}, context)
                .setStandardLayout(user, '/aisearch', `AI Search Results: ${query}`)
                .setDescription(await t('commands.product.searching', {}, guildId));

            for (const [i, p] of products.entries()) {
                const priceStr = p.price
                    ? `\n**${await t('commands.product.price', {}, guildId)}**: ${p.price}`
                    : '';
                const sourceStr = p.source_url
                    ? `\n[${p.source_name || 'Link'}](${p.source_url})`
                    : '';

                embed.addFields({
                    name: `${i + 1}. ${p.name}`,
                    value: `${p.description}${priceStr}${sourceStr}`,
                });
            }

            embed.setFooter({ text: await t('commands.product.footer', {}, guildId) });

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
