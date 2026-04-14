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
    name: 'wikipedia',
    description: 'Cari informasi di Wikipedia dengan tampilan keren',
    async execute(message, args) {
        if (!args.length) {
            return message.reply(
                'Mohon berikan kata kunci pencarian. Contoh: `!wikipedia Discord`'
            );
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply('Sedang mengumpulkan data dari Wikipedia...');

        try {
            const scriptPath = path.join(__dirname, '..', 'API', 'python', 'wiki_fetcher.py');
            const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${query}"`);

            if (stderr) {
                Logger.error('Wikipedia Python Error:', stderr);
                return loadingMsg.edit('Terjadi kesalahan teknis saat mengambil data.');
            }

            const data = JSON.parse(stdout);

            if (data.error) {
                return loadingMsg.edit(data.error);
            }

            const splitText = (text, maxLength) => {
                const chunks = [];
                for (let i = 0; i < text.length; i += maxLength) {
                    chunks.push(text.slice(i, i + maxLength));
                }
                return chunks;
            };

            const pages = splitText(data.summary, 700);
            let currentPage = 0;

            const createEmbed = (pageIndex) => {
                const embed = new EmbedBuilder()
                    .setColor('#20f0f2')
                    .setAuthor({
                        name: `Diminta oleh ${message.author.username}`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(data.title)
                    .setURL(data.fullurl)
                    .setThumbnail(
                        'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png'
                    )
                    .setDescription(pages[pageIndex] + (pages.length > 1 ? '...' : ''))
                    .addFields({
                        name: 'Tautan Lengkap',
                        value: `[Klik di sini untuk baca selengkapnya](${data.fullurl})`,
                        inline: false,
                    })
                    .setFooter({
                        text: `Halaman ${pageIndex + 1} dari ${pages.length} • Wikipedia Indonesia`,
                        iconURL:
                            'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png',
                    })
                    .setTimestamp();

                return embed;
            };

            const createButtons = (pageIndex) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Sebelumnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Berikutnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === pages.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (pages.length > 1) {
                options.components = [createButtons(0)];
            }

            const response = await loadingMsg.edit(options);

            if (pages.length > 1) {
                const collector = response.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 120000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({
                            content: 'Anda tidak memiliki akses ke navigasi ini.',
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev') currentPage--;
                    else if (interaction.customId === 'next') currentPage++;

                    await interaction.update({
                        embeds: [createEmbed(currentPage)],
                        components: [createButtons(currentPage)],
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('p')
                            .setLabel('Selesai')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    response.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('Wikipedia Execution Error:', error);
            loadingMsg.edit('Gagal menghubungi layanan Wikipedia.');
        }
    },
};
