import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('appstore')
        .setDescription('Search for apps on the Apple App Store')
        .addStringOption((option) =>
            option.setName('query').setDescription('The app name to search for').setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('limit')
                .setDescription('Number of results (Default 10)')
                .setMinValue(1)
                .setMaxValue(50)
        )
        .addStringOption((option) =>
            option
                .setName('country')
                .setDescription('The country code (e.g., us, id, ja) (Default "us")')
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let query, limit, country;
        if (isInteraction) {
            query = context.options.getString('query');
            limit = context.options.getInteger('limit') || 10;
            country = context.options.getString('country') || 'us';
        } else {
            // Prefix: !appstore [country] [limit] query
            let argIdx = 0;
            if (args[argIdx]?.length === 2) {
                country = args[argIdx].toLowerCase();
                argIdx++;
            } else {
                country = 'us';
            }

            if (!isNaN(args[argIdx]) && args[argIdx] !== '') {
                limit = parseInt(args[argIdx]);
                argIdx++;
            } else {
                limit = 10;
            }

            query = args.slice(argIdx).join(' ');
        }

        if (!query) {
            const queryReq = await t('commands.appstore.query_required', {}, guildId);
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
            const data = await APIClient.post('/apps/appstore', {
                query: query,
                limit: limit,
                country: country,
            });

            if (data.error) {
                return await editResponse({ content: data.error });
            }

            if (!Array.isArray(data) || data.length === 0) {
                const noResults = await t('commands.appstore.no_results', { query }, guildId);
                return await editResponse({ content: noResults });
            }

            const apps = data;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const app = apps[idx];
                const embed = new EmbedBuilder()
                    .setColor('#007AFF') // Apple Blue
                    .setAuthor({
                        name: await t(
                            'commands.appstore.requested_by',
                            {
                                username: user.username,
                            },
                            guildId
                        ),
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(app.name)
                    .setURL(app.url)
                    .addFields({
                        name: await t('commands.appstore.source_label', {}, guildId),
                        value: 'App Store',
                        inline: true,
                    })
                    .setFooter({
                        text: await t(
                            'commands.appstore.footer',
                            {
                                current: idx + 1,
                                total: apps.length,
                            },
                            guildId
                        ),
                    })
                    .setTimestamp();

                if (app.summary) {
                    embed.setDescription(
                        app.summary.length > 800 ? app.summary.slice(0, 800) + '...' : app.summary
                    );
                }

                if (app.icon_url && app.icon_url.startsWith('http')) {
                    embed.setThumbnail(app.icon_url);
                }

                return embed;
            };

            const createButtons = async (idx) => {
                const app = apps[idx];
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_appstore')
                        .setLabel(await t('commands.appstore.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_appstore')
                        .setLabel(await t('commands.appstore.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === apps.length - 1),
                    new ButtonBuilder()
                        .setLabel(await t('commands.appstore.visit_page', {}, guildId))
                        .setStyle(ButtonStyle.Link)
                        .setURL(app.url)
                );
                return row;
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (apps.length > 0) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (apps.length > 1) {
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

                    if (interaction.customId === 'prev_appstore') currentIdx--;
                    else if (interaction.customId === 'next_appstore') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.appstore.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('AppStore Search Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
