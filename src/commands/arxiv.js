import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('arxiv')
        .setDescription('Search for scientific papers on arXiv')
        .addStringOption((option) =>
            option.setName('query').setDescription('The search query').setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('limit')
                .setDescription('Max number of results (1-10)')
                .setRequired(false)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');
        const limit = (isInteraction ? context.options.getInteger('limit') : 5) || 5;

        if (!query) {
            const msg = await t('common.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const response = await APIClient.post('/research/arxiv', { query, limit, lang });
            const papers = response.results || [];
            const aiSummary = response.ai_summary;

            if (papers.length === 0) {
                const noResultsMsg = await t('commands.arxiv.no_results', { query }, guildId);
                return isInteraction
                    ? context.editReply(noResultsMsg)
                    : context.reply(noResultsMsg);
            }

            let currentIndex = 0;

            const generateEmbed = async (index) => {
                const paper = papers[index];
                const user = isInteraction ? context.user : context.author;
                const embed = new OpenZeroEmbed({}, context)
                    .setStandardLayout(user, '/arxiv', paper.title)
                    .setDescription(paper.summary.substring(0, 1000) + '...');

                embed.addFields(
                    {
                        name: await t('commands.arxiv.authors', {}, guildId),
                        value: paper.authors.join(', ') || 'Unknown',
                    },
                    {
                        name: await t('commands.arxiv.published', {}, guildId),
                        value: new Date(paper.published).toLocaleDateString(),
                        inline: true,
                    },
                    {
                        name: await t('commands.arxiv.category', {}, guildId),
                        value: paper.primary_category,
                        inline: true,
                    }
                );

                if (aiSummary && index === 0) {
                    embed.setAISummary(aiSummary);
                }

                embed.setFooter({
                    text: await t(
                        'commands.arxiv.footer',
                        { current: index + 1, total: papers.length },
                        guildId
                    ),
                });

                return embed;
            };

            const generateButtons = async (index) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel(await t('commands.wikipedia.prev', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel(await t('commands.wikipedia.next', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === papers.length - 1),
                    new ButtonBuilder()
                        .setLabel(await t('commands.arxiv.open_pdf', {}, guildId))
                        .setStyle(ButtonStyle.Link)
                        .setURL(papers[index].pdf_url)
                );
                return row;
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
            Logger.error('arXiv command error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
