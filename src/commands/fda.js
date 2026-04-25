import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('fda')
        .setDescription('Search for products in the FDA database')
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('Category to search in')
                .setRequired(true)
                .addChoices(
                    { name: 'Drug', value: 'drug' },
                    { name: 'Food', value: 'food' },
                    { name: 'Device', value: 'device' }
                )
        )
        .addStringOption((option) =>
            option.setName('query').setDescription('The search keyword').setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('limit')
                .setDescription('Max number of results (1-10)')
                .setRequired(false)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;

        let category, query, limit;

        if (isInteraction) {
            category = context.options.getString('category');
            query = context.options.getString('query');
            limit = context.options.getInteger('limit') || 5;
        } else {
            category = args[0];
            query = args.slice(1).join(' ');
            limit = 5;
        }

        if (!category || !query) {
            const msg = await t('commands.fda.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const response = await APIClient.post('/fda/search', { query, category, limit, lang });
            const results = response.results || [];
            const aiSummary = response.ai_summary;

            if (results.length === 0) {
                const noResultsMsg = await t(
                    'commands.fda.no_results',
                    { query, category },
                    guildId
                );
                return isInteraction
                    ? context.editReply(noResultsMsg)
                    : context.reply(noResultsMsg);
            }

            let currentIndex = 0;

            const generateEmbed = async (index) => {
                const item = results[index];
                const user = isInteraction ? context.user : context.author;
                const embed = new OpenZeroEmbed({}, context).setStandardLayout(
                    user,
                    '/fda',
                    `FDA ${category.toUpperCase()} Result: ${query}`
                );

                if (category === 'drug') {
                    embed.addFields(
                        {
                            name: await t('commands.fda.drug_brand', {}, guildId),
                            value: item.openfda?.brand_name?.[0] || 'Unknown',
                        },
                        {
                            name: await t('commands.fda.drug_generic', {}, guildId),
                            value: item.openfda?.generic_name?.[0] || 'Unknown',
                        },
                        {
                            name: await t('commands.fda.drug_purpose', {}, guildId),
                            value: item.purpose?.[0] || 'N/A',
                        }
                    );
                } else if (category === 'food') {
                    embed.addFields(
                        {
                            name: await t('commands.fda.food_firm', {}, guildId),
                            value: item.recalling_firm || 'Unknown',
                        },
                        {
                            name: await t('commands.fda.food_desc', {}, guildId),
                            value: item.product_description || 'N/A',
                        },
                        {
                            name: await t('commands.fda.food_reason', {}, guildId),
                            value: item.reason_for_recall || 'N/A',
                        }
                    );
                } else {
                    embed.addFields(
                        {
                            name: await t('commands.fda.device_name', {}, guildId),
                            value: item.device_name || 'Unknown',
                        },
                        {
                            name: await t('commands.fda.device_specialty', {}, guildId),
                            value: item.medical_specialty_description || 'N/A',
                        },
                        {
                            name: await t('commands.fda.device_class', {}, guildId),
                            value: item.device_class || 'N/A',
                        }
                    );
                }

                if (aiSummary && index === 0) {
                    embed.setAISummary(aiSummary);
                }

                embed.setFooter({
                    text: await t(
                        'commands.fda.footer',
                        { current: index + 1, total: results.length },
                        guildId
                    ),
                });

                return embed;
            };

            const generateButtons = async (index) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel(await t('commands.wikipedia.prev', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel(await t('commands.wikipedia.next', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === results.length - 1)
                );
                return row;
            };

            const embed = await generateEmbed(currentIndex);
            const row = await generateButtons(currentIndex);

            const message = isInteraction
                ? await context.editReply({ embeds: [embed], components: [row] })
                : await context.reply({ embeds: [embed], components: [row] });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === (isInteraction ? context.user.id : context.author.id),
                time: 60000,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev') currentIndex--;
                else if (i.customId === 'next') currentIndex++;

                const newEmbed = await generateEmbed(currentIndex);
                const newRow = await generateButtons(currentIndex);

                await i.update({ embeds: [newEmbed], components: [newRow] });
            });

            collector.on('end', () => {
                message.edit({ components: [] }).catch(() => {});
            });
        } catch (error) {
            Logger.error('FDA command error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
