import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    name: 'openlibrary',
    description: t('commands.openlibrary.description'),
    async execute(message, args) {
        if (!args.length) {
            return message.reply(t('commands.openlibrary.query_required'));
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply(t('common.loading'));

        try {
            const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
            const response = await fetch(searchUrl);

            if (!response.ok) {
                return loadingMsg.edit(
                    t('commands.openlibrary.api_error', { status: response.status })
                );
            }

            const data = await response.json();

            if (!data.docs || data.docs.length === 0) {
                return loadingMsg.edit(t('commands.openlibrary.no_results', { query }));
            }

            const books = data.docs;
            let currentIdx = 0;

            const createEmbed = (idx) => {
                const book = books[idx];
                const author = book.author_name
                    ? book.author_name.join(', ')
                    : t('commands.openlibrary.unknown_author');
                const firstPublish =
                    book.first_publish_year || t('commands.openlibrary.unknown_year');
                const coverId = book.cover_i;
                const olKey = book.key; // e.g. /works/OL27258W

                const embed = new EmbedBuilder()
                    .setColor('#20f0f2')
                    .setAuthor({
                        name: t('commands.openlibrary.requested_by', {
                            username: message.author.username,
                        }),
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(book.title)
                    .setURL(`https://openlibrary.org${olKey}`)
                    .addFields(
                        { name: t('commands.openlibrary.author'), value: author, inline: true },
                        {
                            name: t('commands.openlibrary.published'),
                            value: String(firstPublish),
                            inline: true,
                        }
                    )
                    .setFooter({
                        text: t('commands.openlibrary.footer', {
                            current: idx + 1,
                            total: books.length,
                        }),
                        iconURL:
                            'https://openlibrary.org/static/images/openlibrary-logo-tighter.svg',
                    })
                    .setTimestamp();

                if (coverId) {
                    embed.setThumbnail(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
                }

                if (book.subject) {
                    const subjects = book.subject.slice(0, 5).join(', ');
                    embed.addFields({ name: t('commands.openlibrary.subject'), value: subjects });
                }

                return embed;
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_book')
                        .setLabel(t('commands.openlibrary.prev'))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_book')
                        .setLabel(t('commands.openlibrary.next'))
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === books.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (books.length > 1) {
                options.components = [createButtons(0)];
            }

            const responseMsg = await loadingMsg.edit(options);

            if (books.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 120000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({
                            content: t('common.access_denied'),
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev_book') currentIdx--;
                    else if (interaction.customId === 'next_book') currentIdx++;

                    await interaction.update({
                        embeds: [createEmbed(currentIdx)],
                        components: [createButtons(currentIdx)],
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(t('commands.openlibrary.finished'))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('OpenLibrary Error:', error);
            loadingMsg.edit(t('common.error', { error: error.message }));
        }
    },
};
