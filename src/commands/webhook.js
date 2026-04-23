import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('webhook')
        .setDescription('Create a Discord Webhook easily')
        .addStringOption((option) =>
            option.setName('name').setDescription('The name of the webhook').setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to create the webhook in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('avatar_url')
                .setDescription('The avatar URL for the webhook')
                .setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;
        const member = context.member;

        // Permission check: Manage Webhooks
        if (!member.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
            return context.reply({
                content: await t('common.access_denied', {}, guildId),
                ephemeral: true,
            });
        }

        let name, targetChannel, avatarUrl;

        if (isInteraction) {
            name = context.options.getString('name');
            targetChannel = context.options.getChannel('channel');
            avatarUrl = context.options.getString('avatar_url');
        } else {
            // Show usage if no args or incomplete
            if (args.length < 3) {
                const helpEmbed = new OpenZeroEmbed({}, context)
                    .setTitle('Webhook Command')
                    .setDescription(await t('commands.webhook.usage', {}, guildId))
                    .addFields({
                        name: 'Example',
                        value: '`!webhook OpenZero Assistant #general https://example.com/image.png`',
                    });
                return context.reply({ embeds: [helpEmbed] });
            }

            // Improved Parsing Logic for prefix:
            const channelMention = args.find((arg) => arg.match(/<#(\d+)>/));
            avatarUrl = args.find((arg) => arg.startsWith('http'));
            const nameArgs = args.filter((arg) => arg !== channelMention && arg !== avatarUrl);
            name = nameArgs.join(' ');

            if (!channelMention) {
                return context.reply(await t('commands.webhook.invalid_channel', {}, guildId));
            }
            if (!avatarUrl) {
                return context.reply(await t('commands.webhook.invalid_url', {}, guildId));
            }
            if (!name || name.length > 80) {
                return context.reply('Please provide a valid name (1-80 characters).');
            }

            const channelId = channelMention.replace(/[<#>]/g, '');
            targetChannel =
                context.guild.channels.cache.get(channelId) ||
                (await context.guild.channels.fetch(channelId).catch(() => null));
        }

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return context.reply(await t('commands.webhook.invalid_channel', {}, guildId));
        }

        // Validate avatar URL (simple check)
        if (!avatarUrl.startsWith('http')) {
            return context.reply(await t('commands.webhook.invalid_url', {}, guildId));
        }

        let loadingMsg = null;
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
            const webhook = await targetChannel.createWebhook({
                name: name,
                avatar: avatarUrl,
                reason: `Created by ${user.tag} via OpenZero`,
            });

            const successEmbed = new OpenZeroEmbed({}, context)
                .setTitle(await t('commands.webhook.success_title', {}, guildId))
                .setThumbnail(avatarUrl)
                .addFields(
                    {
                        name: await t('commands.webhook.field_name', {}, guildId),
                        value: webhook.name,
                        inline: true,
                    },
                    {
                        name: await t('commands.webhook.field_channel', {}, guildId),
                        value: targetChannel.toString(),
                        inline: true,
                    },
                    {
                        name: await t('commands.webhook.field_url', {}, guildId),
                        value: `||${webhook.url}||`,
                    }
                )
                .setFooter({ text: await t('commands.webhook.footer', {}, guildId) });

            await editResponse({ content: null, embeds: [successEmbed] });
        } catch (error) {
            Logger.error('Webhook Creation Error:', error);
            await editResponse({
                content: await t('common.error', { error: error.message }, guildId),
            });
        }
    },
};
