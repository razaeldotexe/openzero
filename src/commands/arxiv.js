import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            const scriptPath = path.join(__dirname, '..', 'API', 'python', 'arxiv_fetcher.py');
            const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${query}"`);

            if (stderr) {
                Logger.error('ArXiv Python Error:', stderr);
                return loadingMsg.edit('Terjadi kesalahan teknis saat mengambil data.');
            }

            const data = JSON.parse(stdout);

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
            Logger.error('ArXiv Error:', error);
            loadingMsg.edit('Terjadi kesalahan saat memproses data arXiv.');
        }
    },
};
