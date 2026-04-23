import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('openlibrary')
        .setDescription('Search for books on Open Library')
        .addStringOption((option) =>
            option.setName('query').setDescription('The book title to search').setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const queryReq = await t('commands.openlibrary.query_required', {}, guildId);
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
            const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
            const response = await fetch(searchUrl);

            if (!response.ok) {
                const apiError = await t(
                    'commands.openlibrary.api_error',
                    { status: response.status },
                    guildId
                );
                return await editResponse({ content: apiError });
            }

            const data = await response.json();

            if (!data.docs || data.docs.length === 0) {
                const noResults = await t('commands.openlibrary.no_results', { query }, guildId);
                return await editResponse({ content: noResults });
            }

            const books = data.docs;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const book = books[idx];
                const author = book.author_name
                    ? book.author_name.join(', ')
                    : await t('commands.openlibrary.unknown_author', {}, guildId);
                const firstPublish =
                    book.first_publish_year ||
                    (await t('commands.openlibrary.unknown_year', {}, guildId));
                const coverId = book.cover_i;
                const olKey = book.key;

                const embed = new OpenZeroEmbed({}, context)
                    .setAuthor({
                        name: await t(
                            'commands.openlibrary.requested_by',
                            {
                                username: user.username,
                            },
                            guildId
                        ),
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(book.title)
                    .setURL(`https://openlibrary.org${olKey}`)
                    .addFields(
                        {
                            name: await t('commands.openlibrary.author', {}, guildId),
                            value: author,
                            inline: true,
                        },
                        {
                            name: await t('commands.openlibrary.published', {}, guildId),
                            value: String(firstPublish),
                            inline: true,
                        }
                    )
                    .setFooter({
                        text: await t(
                            'commands.openlibrary.footer',
                            {
                                current: idx + 1,
                                total: books.length,
                            },
                            guildId
                        ),
                        iconURL:
                            'https://openlibrary.org/static/images/openlibrary-logo-tighter.svg',
                    });

                if (coverId) {
                    embed.setThumbnail(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
                }

                if (book.subject) {
                    const subjects = book.subject.slice(0, 5).join(', ');
                    embed.addFields({
                        name: await t('commands.openlibrary.subject', {}, guildId),
                        value: subjects,
                    });
                }

                return embed;
            };

            const createButtons = async (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_book')
                        .setLabel(await t('commands.openlibrary.prev', {}, guildId))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_book')
                        .setLabel(await t('commands.openlibrary.next', {}, guildId))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === books.length - 1)
                );
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (books.length > 1) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (books.length > 1) {
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

                    if (interaction.customId === 'prev_book') currentIdx--;
                    else if (interaction.customId === 'next_book') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.openlibrary.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('OpenLibrary Error:', error);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
