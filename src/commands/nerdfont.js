import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nerdfont')
        .setDescription('Search and download Nerd Fonts')
        .addStringOption((option) =>
            option.setName('query').setDescription('The font name').setRequired(true)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const msg = await t('commands.nerdfont.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const fonts = await APIClient.post('/research/nerdfont', { query });

            if (fonts.length === 0) {
                const noResultsMsg = await t('commands.nerdfont.no_results', { query }, guildId);
                return isInteraction
                    ? context.editReply(noResultsMsg)
                    : context.reply(noResultsMsg);
            }

            let currentIndex = 0;

            const generateEmbed = async (index) => {
                const font = fonts[index];
                const embed = new OpenZeroEmbed(
                    {
                        title: font.patchedName,
                        description: await t('commands.nerdfont.click_to_download', {}, guildId),
                    },
                    context
                );

                embed.addFields(
                    {
                        name: await t('commands.nerdfont.font_family', {}, guildId),
                        value: font.unpatchedName,
                        inline: true,
                    },
                    {
                        name: await t('commands.nerdfont.folder_name', {}, guildId),
                        value: font.folderName,
                        inline: true,
                    }
                );

                embed.setFooter({
                    text: await t(
                        'commands.nerdfont.footer',
                        { current: index + 1, total: fonts.length },
                        guildId
                    ),
                });

                return embed;
            };

            const generateButtons = async (index) => {
                const font = fonts[index];
                const buttons = [
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel(await t('commands.wikipedia.prev', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel(await t('commands.wikipedia.next', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === fonts.length - 1),
                ];

                if (font.downloadUrl && font.downloadUrl.startsWith('http')) {
                    buttons.push(
                        new ButtonBuilder()
                            .setLabel(await t('commands.nerdfont.download_link', {}, guildId))
                            .setStyle(ButtonStyle.Link)
                            .setURL(font.downloadUrl)
                    );
                }

                return new ActionRowBuilder().addComponents(buttons);
            };

            const embed = await generateEmbed(currentIndex);
            const row = await generateButtons(currentIndex);

            const message = isInteraction
                ? await context.editReply({ embeds: [embed], components: [row] })
                : await context.reply({ embeds: [embed], components: [row] });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === (isInteraction ? context.user.id : context.author.id),
                time: 60000,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev') currentIndex--;
                else if (i.customId === 'next') currentIndex++;

                const newEmbed = await generateEmbed(currentIndex);
                const newRow = await generateButtons(currentIndex);

                await i.update({ embeds: [newEmbed], components: [newRow] });
            });

            collector.on('end', () => {
                message.edit({ components: [] }).catch(() => {});
            });
        } catch (error) {
            Logger.error('NerdFont command error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
