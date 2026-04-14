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
            const response = await fetch(
                `${config.apiUrl}/wikipedia?q=${encodeURIComponent(query)}&lang=id`
            );
            const data = await handleFetchResponse(response, 'Wikipedia Search');

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

            const responseMsg = await loadingMsg.edit(options);

            if (pages.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
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
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('Wikipedia Error:', error.message);
            loadingMsg.edit(`Gagal mengambil data: ${error.message}`);
        }
    },
};
