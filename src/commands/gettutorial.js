import { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { fetchAllTutorialsEmbeds, fetchAllTutorialsRaw } from '../API/github_manager.js';
import { findRelevantFileWithAI } from '../API/ai_manager.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    name: 'gettutorial',
    aliases: ['tutorial'],
    description: t('commands.gettutorial.description'),
    async execute(message, args) {
        const loadingMsg = await message.reply(t('common.loading'));

        try {
            if (args.length > 0) {
                const query = args.join(' ');
                Logger.info(`AI search query: ${query}`);

                const rawFiles = await fetchAllTutorialsRaw();

                if (!rawFiles || rawFiles.size === 0) {
                    return loadingMsg.edit(t('commands.gettutorial.no_tutorials'));
                }

                try {
                    const matchedFileName = await findRelevantFileWithAI(query, rawFiles);

                    if (matchedFileName) {
                        const allTutorials = await fetchAllTutorialsEmbeds();
                        const embeds = allTutorials.get(matchedFileName);

                        if (embeds) {
                            Logger.info(`Found relevant file: ${matchedFileName}`);
                            return loadingMsg.edit({
                                content: t('commands.gettutorial.ai_found', {
                                    file: matchedFileName,
                                }),
                                embeds,
                            });
                        }
                    }

                    return loadingMsg.edit(t('commands.gettutorial.no_relevant', { query }));
                } catch (aiError) {
                    if (aiError.message === 'All providers reached their limits.') {
                        return loadingMsg.edit(t('commands.gettutorial.ai_limit'));
                    }
                    throw aiError;
                }
            }

            const allTutorials = await fetchAllTutorialsEmbeds();
            const fileNames = Array.from(allTutorials.keys());

            if (fileNames.length === 0) {
                return loadingMsg.edit(t('commands.gettutorial.no_found_repo'));
            }

            if (fileNames.length === 1) {
                const fileName = fileNames[0];
                const embeds = allTutorials.get(fileName);
                return loadingMsg.edit({
                    content: t('commands.gettutorial.showing', { file: fileName }),
                    embeds,
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_tutorial')
                .setPlaceholder(t('commands.gettutorial.select_placeholder'))
                .addOptions(
                    fileNames.map((name) => ({
                        label: name.replace('.md', ''),
                        value: name,
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await loadingMsg.edit({
                content: t('commands.gettutorial.choose_list'),
                components: [row],
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id)
                    return interaction.reply({
                        content: t('common.access_denied'),
                        ephemeral: true,
                    });
                const selectedFile = interaction.values[0];
                const embeds = allTutorials.get(selectedFile);
                await interaction.update({
                    content: t('commands.gettutorial.showing', { file: selectedFile }),
                    embeds,
                    components: [],
                });
            });
        } catch (error) {
            Logger.error('Tutorial Search Error:', error);
            loadingMsg.edit(t('common.error', { error: error.message }));
        }
    },
};
