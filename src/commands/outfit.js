import { SlashCommandBuilder } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('outfit')
        .setDescription('Rate your outfit using AI Vision')
        .addAttachmentOption((option) =>
            option.setName('image').setDescription('The image of your outfit').setRequired(false)
        )
        .addStringOption((option) =>
            option.setName('url').setDescription('URL of the outfit image').setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('context')
                .setDescription('Context for the outfit (e.g. job interview, party)')
                .setRequired(false)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let imageUrl, contextText;

        if (isInteraction) {
            const attachment = context.options.getAttachment('image');
            imageUrl = attachment ? attachment.url : context.options.getString('url');
            contextText = context.options.getString('context');
        } else {
            // Prefix command: !outfit [context] (with attachment or link)
            const attachment = context.attachments.first();
            if (attachment) {
                imageUrl = attachment.url;
                contextText = args.join(' ');
            } else {
                // Try to find a URL in args
                const urlArg = args.find((arg) => arg.startsWith('http'));
                if (urlArg) {
                    imageUrl = urlArg;
                    contextText = args.filter((arg) => arg !== urlArg).join(' ');
                } else {
                    contextText = args.join(' ');
                }
            }
        }

        if (!imageUrl) {
            const errorMsg = await t('commands.outfit.image_required', {}, guildId);
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(errorMsg);
            return context.reply({ embeds: [embed] });
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            const loadingText = await t('commands.outfit.loading', {}, guildId);
            const embed = new OpenZeroEmbed({}, context).setDescription(loadingText);
            loadingMsg = await context.reply({ embeds: [embed] });
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            const data = await APIClient.post('/outfit/rate', {
                image_url: imageUrl,
                context: contextText || 'casual wear',
            });

            if (data.error || data.detail) {
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(data.error || data.detail);
                return await editResponse({ embeds: [embed] });
            }

            const embed = new OpenZeroEmbed({}, context)
                .setAuthor({
                    name: await t(
                        'commands.outfit.requested_by',
                        { username: user.username },
                        guildId
                    ),
                    iconURL: user.displayAvatarURL({ dynamic: true }),
                })
                .setTitle(await t('commands.outfit.result_title', { score: data.score }, guildId))
                .setDescription(data.feedback)
                .setThumbnail(imageUrl)
                .addFields({
                    name: await t('commands.outfit.suggestions_label', {}, guildId),
                    value: data.suggestions.map((s) => `> • ${s}`).join('\n'),
                })
                .setFooter({
                    text: await t('commands.outfit.footer', {}, guildId),
                });

            await editResponse({ content: null, embeds: [embed] });
        } catch (error) {
            Logger.error('Outfit Rating Error:', error.message);
            const errorText = await t('common.error', { error: error.message }, guildId);
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(errorText);
            await editResponse({ embeds: [embed] });
        }
    },
};
