import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { config } from '../config.js';
import Logger from '../utils/logger.js';

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

export default {
    name: 'arxiv',
    description: 'Cari makalah ilmiah di arXiv',
    async execute(message, args) {
        if (!args.length) {
            return message.reply(
                'Mohon berikan kata kunci pencarian. Contoh: `!arxiv quantum computing`'
            );
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply('Sedang mencari makalah di arXiv...');

        try {
            const response = await fetch(`${config.apiUrl}/arxiv?q=${encodeURIComponent(query)}`);
            const data = await handleFetchResponse(response, 'ArXiv Search');

            if (data.error) {
                return loadingMsg.edit(data.error);
            }

            if (!Array.isArray(data) || data.length === 0) {
                return loadingMsg.edit(`Tidak ada makalah yang ditemukan untuk "${query}".`);
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
                        name: `Diminta oleh ${message.author.username}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(paper.title)
                    .setURL(paper.entry_id)
                    .setDescription(summary)
                    .addFields(
                        {
                            name: 'Penulis',
                            value: authors.length > 256 ? authors.slice(0, 250) + '...' : authors,
                        },
                        { name: 'Terbit', value: paper.published, inline: true },
                        { name: 'Kategori', value: paper.primary_category, inline: true },
                        { name: 'PDF', value: `[Buka PDF](${paper.pdf_url})`, inline: true }
                    )
                    .setFooter({
                        text: `Hasil ${idx + 1} dari ${papers.length} | arXiv API`,
                        iconURL:
                            'https://static.arxiv.org/static/browse/0.3.4/images/icons/apple-touch-icon.png',
                    })
                    .setTimestamp();
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_paper')
                        .setLabel('Sebelumnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_paper')
                        .setLabel('Berikutnya')
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
                        return interaction.reply({ content: 'Akses ditolak.', ephemeral: true });
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
                            .setLabel('Pencarian Selesai')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('ArXiv Error:', error.message);
            loadingMsg.edit(`Gagal mengambil data: ${error.message}`);
        }
    },
};
