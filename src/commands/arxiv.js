import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { config } from '../config.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

/**
 * Helper to handle fetch responses and check for JSON.
 */
async function handleFetchResponse(response, context = '') {
    if (!response.ok) {
        const text = await response.text();
        Logger.error(
            `API Error (${context}): Status ${response.status}. Response: ${text.slice(0, 100)}...`
        );
        throw new Error(`API service returned an error: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        Logger.error(
            `Expected JSON but got: ${contentType} in ${context}. Content preview: ${text.slice(0, 100)}...`
        );
        throw new Error('API returned HTML instead of JSON. Check if your API_URL is correct.');
    }
    return response.json();
}

const API_HEADERS = {
    'User-Agent': 'OpenZeroBot/1.0 (DiscordBot; +https://github.com/razaeldotexe/open-0)',
};

export default {
    name: 'arxiv',
    description: t('commands.arxiv.description'),
    async execute(message, args) {
        if (!args.length) {
            return message.reply(t('common.query_required'));
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply(t('common.loading'));

        try {
            const response = await fetch(`${config.apiUrl}/arxiv?q=${encodeURIComponent(query)}`, {
                headers: API_HEADERS,
            });
            const data = await handleFetchResponse(response, 'ArXiv Search');

            if (data.error) {
                return loadingMsg.edit(data.error);
            }

            if (!Array.isArray(data) || data.length === 0) {
                return loadingMsg.edit(t('commands.arxiv.no_results', { query }));
            }

            const papers = data;
            let currentIdx = 0;

            const createEmbed = (idx) => {
                const paper = papers[idx];
                const authors = paper.authors.join(', ');
                const summary =
                    paper.summary.length > 800
                        ? paper.summary.slice(0, 800) + '...'
                        : paper.summary;

                return new EmbedBuilder()
                    .setColor('#20f0f2')
                    .setAuthor({
                        name: t('commands.arxiv.requested_by', {
                            username: message.author.username,
                        }),
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(paper.title)
                    .setURL(paper.entry_id)
                    .setDescription(summary)
                    .addFields(
                        {
                            name: t('commands.arxiv.authors'),
                            value: authors.length > 256 ? authors.slice(0, 250) + '...' : authors,
                        },
                        {
                            name: t('commands.arxiv.published'),
                            value: paper.published,
                            inline: true,
                        },
                        {
                            name: t('commands.arxiv.category'),
                            value: paper.primary_category,
                            inline: true,
                        },
                        {
                            name: 'PDF',
                            value: `[${t('commands.arxiv.open_pdf')}](${paper.pdf_url})`,
                            inline: true,
                        }
                    )
                    .setFooter({
                        text: t('commands.arxiv.footer', {
                            current: idx + 1,
                            total: papers.length,
                        }),
                        iconURL:
                            'https://static.arxiv.org/static/browse/0.3.4/images/icons/apple-touch-icon.png',
                    })
                    .setTimestamp();
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_paper')
                        .setLabel(t('commands.arxiv.prev'))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_paper')
                        .setLabel(t('commands.arxiv.next'))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === papers.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (papers.length > 1) {
                options.components = [createButtons(0)];
            }

            const responseMsg = await loadingMsg.edit(options);

            if (papers.length > 1) {
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

                    if (interaction.customId === 'prev_paper') currentIdx--;
                    else if (interaction.customId === 'next_paper') currentIdx++;

                    await interaction.update({
                        embeds: [createEmbed(currentIdx)],
                        components: [createButtons(currentIdx)],
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(t('commands.arxiv.finished'))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('ArXiv Error:', error.message);
            loadingMsg.edit(t('common.error', { error: error.message }));
        }
    },
};
