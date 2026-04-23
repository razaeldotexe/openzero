import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nerdfont')
        .setDescription('Search and download Nerd Fonts')
        .addStringOption((option) =>
            option.setName('query').setDescription('The font name to search').setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const queryReq = await t('commands.nerdfont.query_required', {}, guildId);
            return context.reply(queryReq);
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            loadingMsg = await context.reply(await t('common.loading', {}, guildId));
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            const data = await APIClient.post('/research/nerdfont', {
                query: query,
            });

            if (data.error) {
                return await editResponse({ content: data.error });
            }

            if (!Array.isArray(data) || data.length === 0) {
                const noResults = await t('commands.nerdfont.no_results', { query }, guildId);
                return await editResponse({ content: noResults });
            }

            const fonts = data;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const font = fonts[idx];
                return new OpenZeroEmbed({}, context)
                    .setTitle(font.patchedName)
                    .setDescription(
                        `${await t('commands.nerdfont.font_family', {}, guildId)}: **${font.unpatchedName}**`
                    )
                    .addFields(
                        {
                            name: await t('commands.nerdfont.folder_name', {}, guildId),
                            value: font.folderName,
                            inline: true,
                        },
                        {
                            name: await t('commands.nerdfont.download_link', {}, guildId),
                            value: `[${await t('commands.nerdfont.click_to_download', {}, guildId)}](${font.downloadUrl})`,
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: await t(
                            'commands.nerdfont.footer',
                            {
                                current: idx + 1,
                                total: fonts.length,
                            },
                            guildId
                        ),
                    });
            };

            const createButtons = async (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_font')
                        .setLabel(await t('commands.nerdfont.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_font')
                        .setLabel(await t('commands.nerdfont.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === fonts.length - 1)
                );
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (fonts.length > 1) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (fonts.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== user.id) {
                        return interaction.reply({
                            content: await t('common.access_denied', {}, guildId),
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev_font') currentIdx--;
                    else if (interaction.customId === 'next_font') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.nerdfont.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('NerdFont Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
