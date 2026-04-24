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
        .setName('arxiv')
        .setDescription('Search for scientific papers on arXiv')
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
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(queryReq);
            return context.reply({ embeds: [embed] });
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            const loadingText = await t('common.loading', {}, guildId);
            const embed = new OpenZeroEmbed({}, context).setDescription(loadingText);
            loadingMsg = await context.reply({ embeds: [embed] });
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            const data = await APIClient.post('/research/arxiv', {
                query: query,
                limit: 10,
            });

            if (data.error) {
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(data.error);
                return await editResponse({ embeds: [embed] });
            }

            if (!Array.isArray(data) || data.length === 0) {
                const noResults = await t('commands.arxiv.no_results', { query }, guildId);
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(noResults);
                return await editResponse({ embeds: [embed] });
            }

            const papers = data;
            let currentIdx = 0;

            const createEmbed = async (idx) => {
                const paper = papers[idx];
                const authors = paper.authors.join(', ');
                const summary =
                    paper.summary.length > 800
                        ? paper.summary.slice(0, 800) + '...'
                        : paper.summary;

                return new OpenZeroEmbed({}, context)
                    .setAuthor({
                        name: await t(
                            'commands.arxiv.requested_by',
                            {
                                username: user.username,
                            },
                            guildId
                        ),
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(paper.title)
                    .setURL(paper.entry_id)
                    .setDescription(summary)
                    .addFields(
                        {
                            name: await t('commands.arxiv.authors', {}, guildId),
                            value: authors.length > 256 ? authors.slice(0, 250) + '...' : authors,
                        },
                        {
                            name: await t('commands.arxiv.published', {}, guildId),
                            value: paper.published,
                            inline: true,
                        },
                        {
                            name: await t('commands.arxiv.category', {}, guildId),
                            value: paper.primary_category,
                            inline: true,
                        },
                        {
                            name: 'PDF',
                            value: `[${await t('commands.arxiv.open_pdf', {}, guildId)}](${paper.pdf_url})`,
                            inline: true,
                        }
                    )
                    .setFooter({
                        text: await t(
                            'commands.arxiv.footer',
                            {
                                current: idx + 1,
                                total: papers.length,
                            },
                            guildId
                        ),
                        iconURL:
                            'https://static.arxiv.org/static/browse/0.3.4/images/icons/apple-touch-icon.png',
                    });
            };

            const createButtons = async (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_paper')
                        .setLabel(await t('commands.arxiv.prev', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_paper')
                        .setLabel(await t('commands.arxiv.next', {}, guildId))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === papers.length - 1)
                );
            };

            const options = { content: null, embeds: [await createEmbed(0)] };
            if (papers.length > 1) {
                options.components = [await createButtons(0)];
            }

            const responseMsg = await editResponse(options);

            if (papers.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 120000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== user.id) {
                        const accessDeniedEmbed = new OpenZeroEmbed({}, context)
                            .setTitle(await t('common.error_title', {}, guildId))
                            .setDescription(await t('common.access_denied', {}, guildId));
                        return interaction.reply({
                            embeds: [accessDeniedEmbed],
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev_paper') currentIdx--;
                    else if (interaction.customId === 'next_paper') currentIdx++;

                    await interaction.update({
                        embeds: [await createEmbed(currentIdx)],
                        components: [await createButtons(currentIdx)],
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(await t('commands.arxiv.finished', {}, guildId))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await editResponse({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('ArXiv Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(errorText);
            await editResponse({ embeds: [embed] });
        }
    },
};
