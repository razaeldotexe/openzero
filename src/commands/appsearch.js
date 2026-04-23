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
        .setName('appsearch')
        .setDescription('Search for Android apps on F-Droid or GitHub')
        .addStringOption((option) =>
            option.setName('query').setDescription('The app name to search for').setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('source')
                .setDescription('The source to search in')
                .addChoices(
                    { name: 'F-Droid', value: 'fdroid' },
                    { name: 'GitHub', value: 'github' }
                )
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let query, source;
        if (isInteraction) {
            query = context.options.getString('query');
            source = context.options.getString('source') || 'fdroid';
        } else {
            // Prefix: !appsearch [source:github/fdroid] query
            if (args[0]?.toLowerCase() === 'github' || args[0]?.toLowerCase() === 'fdroid') {
                source = args[0].toLowerCase();
                query = args.slice(1).join(' ');
            } else {
                source = 'fdroid';
                query = args.join(' ');
            }
        }

        if (!query) {
            const queryReq = await t('commands.appsearch.query_required', {}, guildId);
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
            const data = await APIClient.post(`/apps/${source}`, {
                query: query,
                limit: 10,
            });

            if (data.error) {
                return await editResponse({ content: data.error });
            }

            if (!Array.isArray(data) || data.length === 0) {
                const sourceDisplay = source === 'github' ? 'GitHub' : 'F-Droid';
                const noResults = await t(
                    'commands.appsearch.no_results',
                    { query, source: sourceDisplay },
                    guildId
                );
                return await editResponse({ content: noResults });
            }

            const apps = data;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const app = apps[idx];
                const embed = new OpenZeroEmbed({}, context)
                    .setColor('#20f0f2')
                    .setAuthor({
                        name: await t(
                            'commands.appsearch.requested_by',
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
                        name: await t('commands.appsearch.source_label', {}, guildId),
                        value: app.source.toUpperCase(),
                        inline: true,
                    })
                    .setFooter({
                        text: await t(
                            'commands.appsearch.footer',
                            {
                                current: idx + 1,
                                total: apps.length,
                            },
                            guildId
                        ),
                    });

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
                        .setCustomId('prev_app')
                        .setLabel(await t('commands.appsearch.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_app')
                        .setLabel(await t('commands.appsearch.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === apps.length - 1),
                    new ButtonBuilder()
                        .setLabel(await t('commands.appsearch.visit_page', {}, guildId))
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

                    if (interaction.customId === 'prev_app') currentIdx--;
                    else if (interaction.customId === 'next_app') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.appsearch.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('AppSearch Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
