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
    name: 'nerdfont',
    aliases: ['nf'],
    description: 'Cari dan download Nerd Fonts',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Mohon berikan nama font yang dicari. Contoh: `!nf jetbrains`');
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply('Sedang mencari font...');

        try {
            const scriptPath = path.join(__dirname, '..', 'API', 'python', 'nerdfont_fetcher.py');
            const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${query}"`);

            if (stderr) {
                Logger.error('NerdFont Python Error:', stderr);
                return loadingMsg.edit('Terjadi kesalahan teknis saat mengambil data.');
            }

            const data = JSON.parse(stdout);

            if (data.error) {
                return loadingMsg.edit(data.error);
            }

            if (!Array.isArray(data) || data.length === 0) {
                return loadingMsg.edit(`Tidak ada font yang ditemukan untuk "${query}".`);
            }

            const fonts = data;
            let currentIdx = 0;

            const createEmbed = (idx) => {
                const font = fonts[idx];
                return new EmbedBuilder()
                    .setColor('#20f0f2')
                    .setTitle(font.patchedName)
                    .setDescription(`Font Family: **${font.unpatchedName}**`)
                    .addFields(
                        { name: 'Folder Name', value: font.folderName, inline: true },
                        {
                            name: 'Download Link',
                            value: `[Klik di sini untuk Download (.zip)](${font.downloadUrl})`,
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: `Hasil ${idx + 1} dari ${fonts.length} • Nerd Fonts API`,
                    })
                    .setTimestamp();
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_font')
                        .setLabel('Sebelumnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_font')
                        .setLabel('Berikutnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === fonts.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (fonts.length > 1) {
                options.components = [createButtons(0)];
            }

            const responseMsg = await loadingMsg.edit(options);

            if (fonts.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({ content: 'Akses ditolak.', ephemeral: true });
                    }

                    if (interaction.customId === 'prev_font') currentIdx--;
                    else if (interaction.customId === 'next_font') currentIdx++;

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
            Logger.error('NerdFont Error:', error);
            loadingMsg.edit('Terjadi kesalahan saat memproses data font.');
        }
    },
};
