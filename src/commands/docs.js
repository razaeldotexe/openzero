import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Search documentation and get AI-synthesized answers')
        .addStringOption((option) =>
            option.setName('query').setDescription('What to search for?').setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('framework')
                .setDescription('Specific framework (e.g., react, nextjs)')
                .setRequired(false)
        ),
    async execute(context, args) {
        const isInteraction = context.isChatInputCommand?.();
        const guildId = context.guildId;
        const query = isInteraction ? context.options.getString('query') : args.join(' ');
        const framework = isInteraction ? context.options.getString('framework') : null;

        if (!query) {
            const msg = await t('common.query_required', {}, guildId);
            return isInteraction
                ? context.reply({ content: msg, ephemeral: true })
                : context.reply(msg);
        }

        if (isInteraction) await context.deferReply();

        try {
            const lang = await getLanguage(guildId);
            const endpoint = `/docs?q=${encodeURIComponent(query)}${framework ? `&framework=${encodeURIComponent(framework)}` : ''}&lang=${encodeURIComponent(lang)}`;
            const data = await APIClient.get(endpoint);

            const user = isInteraction ? context.user : context.author;
            const embed = new OpenZeroEmbed({}, context)
                .setStandardLayout(user, '/docs', `Docs Search: ${query}`)
                .setAISummary(data.answer);

            if (data.source) {
                embed.addFields({ name: 'Source', value: data.source, inline: true });
            }

            const components = [];
            if (data.url) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('View Original Docs')
                        .setStyle(ButtonStyle.Link)
                        .setURL(data.url)
                );
                components.push(row);
            }

            return isInteraction
                ? context.editReply({ embeds: [embed], components })
                : context.reply({ embeds: [embed], components });
        } catch (error) {
            Logger.error('Docs command error:', error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return isInteraction ? context.editReply(errorMsg) : context.reply(errorMsg);
        }
    },
};
