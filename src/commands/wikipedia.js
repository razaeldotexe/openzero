import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('wikipedia')
        .setDescription('Search for information on Wikipedia')
        .addStringOption((option) =>
            option.setName('query').setDescription('The search query').setRequired(true)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');

        if (!query) {
            const msg = await t('common.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const data = await APIClient.post('/research/wikipedia', { query, lang });
            const user = isInteraction ? context.user : context.author;

            const embed = new OpenZeroEmbed({}, context)
                .setStandardLayout(user, '/wikipedia', data.title)
                .setDescription(`${data.summary} `)
                .setAISummary(data.ai_summary);

            const components = [];
            if (data.fullurl && data.fullurl.startsWith('http')) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(await t('commands.wikipedia.full_link', {}, guildId))
                        .setStyle(ButtonStyle.Link)
                        .setURL(data.fullurl)
                );
                components.push(row);
            }

            return isInteraction
                ? context.editReply({ embeds: [embed], components })
                : context.reply({ embeds: [embed], components });
        } catch (error) {
            Logger.error('Wikipedia command error:', error);
            const errorMsg = error.message.includes('404')
                ? await t('commands.wikipedia.page_not_found', {}, guildId)
                : await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
