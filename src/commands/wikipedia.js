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
        .setName('wikipedia')
        .setDescription('Search for information on Wikipedia with a cool interface')
        .addStringOption((option) =>
            option.setName('query').setDescription('The search query').setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const queryReq = await t('common.query_required', {}, guildId);
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
            const data = await APIClient.post('/research/wikipedia', {
                query: query,
            });

            if (data.error) {
                return await editResponse({ content: data.error });
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

            const createEmbed = async (pageIndex) => {
                const embed = new OpenZeroEmbed({}, context)
                    .setAuthor({
                        name: await t(
                            'commands.wikipedia.requested_by',
                            {
                                username: user.username,
                            },
                            guildId
                        ),
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(data.title)
                    .setURL(data.fullurl)
                    .setThumbnail(
                        'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png'
                    )
                    .setDescription(pages[pageIndex] + (pages.length > 1 ? '...' : ''))
                    .addFields({
                        name: await t('commands.wikipedia.full_link', {}, guildId),
                        value: `[${await t('commands.wikipedia.read_more', {}, guildId)}](${data.fullurl})`,
                        inline: false,
                    })
                    .setFooter({
                        text: await t(
                            'commands.wikipedia.footer',
                            {
                                current: pageIndex + 1,
                                total: pages.length,
                            },
                            guildId
                        ),
                        iconURL:
                            'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png',
                    });

                return embed;
            };

            const createButtons = async (pageIndex) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel(await t('commands.wikipedia.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel(await t('commands.wikipedia.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === pages.length - 1)
                );
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (pages.length > 1) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (pages.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 120000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== user.id) {
                        return interaction.reply({
                            content: await t('common.access_denied', {}, guildId),
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev') currentPage--;
                    else if (interaction.customId === 'next') currentPage++;

                    await interaction.update({
                        embeds: [await createEmbed(currentPage)],
                        components: [await createButtons(currentPage)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('p')
                            .setLabel(await t('commands.wikipedia.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('Wikipedia Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            await editResponse({ content: errorText });
        }
    },
};
