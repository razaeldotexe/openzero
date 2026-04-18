import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    name: 'full',
    description: t('commands.full.description'),
    async execute(message, args) {
        // Cek izin moderasi (Manage Messages sebagai standar minimum)
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply(t('common.access_denied'));
        }

        if (!args.length) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(t('commands.full.guide_title'))
                .setDescription(t('commands.full.guide_desc'))
                .addFields(
                    { name: '!full info @user', value: t('commands.full.info_desc') },
                    { name: '!full clear <amount>', value: t('commands.full.clear_desc') },
                    { name: '!full kick @user [reason]', value: t('commands.full.kick_desc') },
                    { name: '!full ban @user [reason]', value: t('commands.full.ban_desc') }
                )
                .setTimestamp();
            return message.reply({ embeds: [helpEmbed] });
        }

        const subCommand = args[0].toLowerCase();
        const targetArgs = args.slice(1);

        try {
            switch (subCommand) {
                case 'info':
                    return await handleInfo(message);
                case 'clear':
                    return await handleClear(message, targetArgs);
                case 'kick':
                    return await handleKick(message, targetArgs);
                case 'ban':
                    return await handleBan(message, targetArgs);
                default:
                    return message.reply(t('commands.full.unknown_sub'));
            }
        } catch (error) {
            Logger.error(`Error in !full ${subCommand}:`, error);
            message.reply(t('common.error', { error: error.message }));
        }
    },
};

async function handleInfo(message) {
    const target = message.mentions.members.first() || message.member;
    const roles =
        target.roles.cache
            .filter((role) => role.name !== '@everyone')
            .map((role) => role.toString())
            .join(', ') || t('commands.full.no_roles');

    const embed = new EmbedBuilder()
        .setColor('#20f0f2')
        .setTitle(t('commands.full.user_info', { tag: target.user.tag }))
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: t('commands.full.user_id'), value: target.id, inline: true },
            { name: t('commands.full.nickname'), value: target.displayName, inline: true },
            {
                name: t('commands.full.account_created'),
                value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`,
                inline: true,
            },
            {
                name: t('commands.full.joined_server'),
                value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
                inline: true,
            },
            { name: `Roles [${target.roles.cache.size - 1}]`, value: roles }
        )
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function handleClear(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply(t('commands.full.clear_no_perms'));
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
        return message.reply(t('commands.full.clear_invalid'));
    }

    await message.channel.bulkDelete(amount + 1, true);
    const msg = await message.channel.send(t('commands.full.clear_success', { amount }));
    setTimeout(() => msg.delete().catch(() => {}), 3000);
}

async function handleKick(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply(t('commands.full.kick_no_perms'));
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(t('commands.full.kick_mention'));
    if (!target.kickable) return message.reply(t('commands.full.kick_unable'));

    const reason = args.slice(1).join(' ') || t('commands.full.no_reason');
    await target.kick(reason);

    return message.reply(t('commands.full.kick_success', { tag: target.user.tag, reason }));
}

async function handleBan(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply(t('commands.full.ban_no_perms'));
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply(t('commands.full.ban_mention'));
    if (!target.bannable) return message.reply(t('commands.full.ban_unable'));

    const reason = args.slice(1).join(' ') || t('commands.full.no_reason');
    await target.ban({ reason });

    return message.reply(t('commands.full.ban_success', { tag: target.user.tag, reason }));
}
