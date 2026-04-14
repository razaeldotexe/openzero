import { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { fetchAllTutorialsEmbeds, fetchAllTutorialsRaw } from '../API/github_manager.js';
import { findRelevantFileWithAI } from '../API/ai_manager.js';
import Logger from '../utils/logger.js';

export default {
    name: 'gettutorial',
    aliases: ['tutorial'],
    description: 'Mengambil tutorial dari repository GitHub Resource menggunakan AI.',
    async execute(message, args) {
        const loadingMsg = await message.reply('Sedang mencari tutorial yang relevan...');

        try {
            if (args.length > 0) {
                const query = args.join(' ');
                Logger.info(`AI search query: ${query}`);

                const rawFiles = await fetchAllTutorialsRaw();

                if (!rawFiles || rawFiles.size === 0) {
                    return loadingMsg.edit('Tidak ada tutorial yang tersedia saat ini.');
                }

                try {
                    const matchedFileName = await findRelevantFileWithAI(query, rawFiles);

                    if (matchedFileName) {
                        const allTutorials = await fetchAllTutorialsEmbeds();
                        const embeds = allTutorials.get(matchedFileName);

                        if (embeds) {
                            Logger.info(`Found relevant file: ${matchedFileName}`);
                            return loadingMsg.edit({
                                content: `AI menemukan tutorial yang paling relevan: **${matchedFileName}**`,
                                embeds,
                            });
                        }
                    }

                    return loadingMsg.edit(
                        `Maaf, AI tidak menemukan tutorial yang relevan dengan query: "${query}".`
                    );
                } catch (aiError) {
                    if (aiError.message === 'All providers reached their limits.') {
                        return loadingMsg.edit('Sorry, the library staff are currently on break.');
                    }
                    throw aiError;
                }
            }

            const allTutorials = await fetchAllTutorialsEmbeds();
            const fileNames = Array.from(allTutorials.keys());

            if (fileNames.length === 0) {
                return loadingMsg.edit('Tidak ada tutorial yang ditemukan di repository.');
            }

            if (fileNames.length === 1) {
                const fileName = fileNames[0];
                const embeds = allTutorials.get(fileName);
                return loadingMsg.edit({
                    content: `Menampilkan tutorial: **${fileName}**`,
                    embeds,
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_tutorial')
                .setPlaceholder('Pilih tutorial...')
                .addOptions(
                    fileNames.map((name) => ({
                        label: name.replace('.md', ''),
                        value: name,
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await loadingMsg.edit({
                content: `Gunakan \`!tutorial <query>\` untuk pencarian AI, atau pilih dari daftar:`,
                components: [row],
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id)
                    return interaction.reply({ content: 'Akses ditolak.', ephemeral: true });
                const selectedFile = interaction.values[0];
                const embeds = allTutorials.get(selectedFile);
                await interaction.update({
                    content: `Menampilkan: **${selectedFile}**`,
                    embeds,
                    components: [],
                });
            });
        } catch (error) {
            Logger.error('Tutorial Search Error:', error);
            loadingMsg.edit('Terjadi kesalahan saat memproses permintaan tutorial.');
        }
    },
};
