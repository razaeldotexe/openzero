import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('product')
        .setDescription('Search for products using AI recommendations')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The product you are looking for')
                .setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const msg = await t('commands.product.query_required', {}, guildId);
            return context.reply({ content: msg, ephemeral: true });
        }

        let loadingMsg = null;
        if (isInteraction) {
            await context.deferReply();
        } else {
            const searchingText = await t('commands.product.searching', {}, guildId);
            loadingMsg = await context.reply(searchingText);
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            // Call Delema API (Hybrid Search)
            const products = await APIClient.post('/ai/search-products', {
                query: query,
                limit: 5,
            });

            if (!Array.isArray(products) || products.length === 0) {
                const noResults = await t('commands.product.no_results', { query }, guildId);
                return await editResponse({ content: noResults });
            }

            const embed = new OpenZeroEmbed({}, context)
                .setTitle(`🛍️ AI Product Search: ${query}`)
                .setFooter({ text: await t('commands.product.footer', {}, guildId) });

            const priceLabel = await t('commands.product.price', {}, guildId);
            const actionRow = new ActionRowBuilder();

            products.forEach((p, index) => {
                embed.addFields({
                    name: `🔹 ${p.name}`,
                    value: `${p.description}\n**${priceLabel}:** ${p.price}\n*Source: ${p.source_name}*`,
                    inline: false,
                });

                // Add button if real URL exists (max 5 buttons per row)
                if (p.source_url && p.source_url.startsWith('http') && index < 5) {
                    actionRow.addComponents(
                        new ButtonBuilder()
                            .setLabel(`Buy Product ${index + 1}`)
                            .setStyle(ButtonStyle.Link)
                            .setURL(p.source_url)
                    );
                }
            });

            const responseOptions = { content: null, embeds: [embed] };
            if (actionRow.components.length > 0) {
                responseOptions.components = [actionRow];
            }

            await editResponse(responseOptions);
        } catch (error) {
            Logger.error('Product Search Error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorMsg });
        }
    },
};
