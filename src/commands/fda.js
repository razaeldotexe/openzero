import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('fda')
        .setDescription('Search for products in the FDA database (Drugs, Food, Devices)')
        .addStringOption((option) =>
            option.setName('query').setDescription('The search keyword').setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('The category to search in')
                .addChoices(
                    { name: 'Drug (Labels)', value: 'drug' },
                    { name: 'Food (Recalls)', value: 'food' },
                    { name: 'Device (Classification)', value: 'device' }
                )
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let query, category;
        if (isInteraction) {
            query = context.options.getString('query');
            category = context.options.getString('category') || 'drug';
        } else {
            // Prefix: !fda [category] query
            if (['drug', 'food', 'device'].includes(args[0]?.toLowerCase())) {
                category = args[0].toLowerCase();
                query = args.slice(1).join(' ');
            } else {
                category = 'drug';
                query = args.join(' ');
            }
        }

        if (!query) {
            const queryReq = await t('commands.fda.query_required', {}, guildId);
            return context.reply(queryReq);
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            loadingMsg = await context.reply(await t('common.loading', {}, guildId));
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            const data = await APIClient.post('/fda/search', {
                query: query,
                category: category,
                limit: 10,
            });

            if (data.results.length === 0) {
                const noResults = await t(
                    'commands.fda.no_results',
                    { query, category: category.toUpperCase() },
                    guildId
                );
                return await editResponse({ content: noResults });
            }

            const results = data.results;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const item = results[idx];
                const embed = new OpenZeroEmbed({}, context)
                    .setColor('#20f0f2')
                    .setAuthor({
                        name: await t(
                            'commands.fda.requested_by',
                            { username: user.username },
                            guildId
                        ),
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setFooter({
                        text: await t(
                            'commands.fda.footer',
                            {
                                current: idx + 1,
                                total: results.length,
                            },
                            guildId
                        ),
                    });

                // Dynamic formatting based on category
                if (category === 'drug') {
                    const brand = item.openfda?.brand_name?.[0] || 'N/A';
                    const generic = item.openfda?.generic_name?.[0] || 'N/A';
                    const purpose = item.purpose?.[0] || 'N/A';

                    embed.setTitle(brand).addFields(
                        {
                            name: await t('commands.fda.drug_generic', {}, guildId),
                            value: generic,
                            inline: true,
                        },
                        {
                            name: await t('commands.fda.category_label', {}, guildId),
                            value: 'Drug',
                            inline: true,
                        },
                        {
                            name: await t('commands.fda.drug_purpose', {}, guildId),
                            value: purpose.length > 500 ? purpose.slice(0, 500) + '...' : purpose,
                        }
                    );
                } else if (category === 'food') {
                    const firm = item.recalling_firm || 'N/A';
                    const desc = item.product_description || 'N/A';
                    const reason = item.reason_for_recall || 'N/A';

                    embed.setTitle(firm).addFields(
                        {
                            name: await t('commands.fda.category_label', {}, guildId),
                            value: 'Food Recall',
                            inline: true,
                        },
                        {
                            name: await t('commands.fda.food_desc', {}, guildId),
                            value: desc.length > 500 ? desc.slice(0, 500) + '...' : desc,
                        },
                        {
                            name: await t('commands.fda.food_reason', {}, guildId),
                            value: reason.length > 500 ? reason.slice(0, 500) + '...' : reason,
                        }
                    );
                } else if (category === 'device') {
                    const name = item.device_name || 'N/A';
                    const specialty = item.medical_specialty_description || 'N/A';
                    const devClass = item.device_class || 'N/A';

                    embed.setTitle(name).addFields(
                        {
                            name: await t('commands.fda.device_specialty', {}, guildId),
                            value: specialty,
                            inline: true,
                        },
                        {
                            name: await t('commands.fda.device_class', {}, guildId),
                            value: devClass,
                            inline: true,
                        },
                        {
                            name: await t('commands.fda.category_label', {}, guildId),
                            value: 'Medical Device',
                            inline: true,
                        }
                    );
                }

                return embed;
            };

            const createButtons = async (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_fda')
                        .setLabel(await t('commands.fda.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_fda')
                        .setLabel(await t('commands.fda.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === results.length - 1)
                );
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (results.length > 1) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (results.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 120000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== user.id) {
                        return interaction.reply({
                            content: await t('common.access_denied', {}, guildId),
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev_fda') currentIdx--;
                    else if (interaction.customId === 'next_fda') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.fda.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('FDA Search Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
