import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server')
        .addUserOption((option) =>
            option.setName('target').setDescription('The member to ban').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('The reason for banning')
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();

        if (!context.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(await t('commands.ban.no_perms', {}, guildId));
            return context.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        let target;
        let reason;

        if (isInteraction) {
            target = context.options.getMember('target');
            reason =
                context.options.getString('reason') ||
                (await t('commands.ban.no_reason', {}, guildId));
        } else {
            if (args.length === 0) {
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(await t('commands.ban.mention', {}, guildId));
                return context.reply({ embeds: [embed] });
            }
            const userId = args[0].replace(/[<@!>]/g, '');
            target =
                context.guild.members.cache.get(userId) ||
                (await context.guild.members.fetch(userId).catch(() => null));
            reason = args.slice(1).join(' ') || (await t('commands.ban.no_reason', {}, guildId));
        }

        if (!target) {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(await t('commands.ban.mention', {}, guildId));
            return context.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }
        if (!target.bannable) {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(await t('commands.ban.unable', {}, guildId));
            return context.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await target.ban({ reason });

        const embed = new OpenZeroEmbed({}, context)
            .setTitle(await t('common.success', {}, guildId))
            .setDescription(
                await t('commands.ban.success', { tag: target.user.tag, reason }, guildId)
            );

        return context.reply({ embeds: [embed] });
    },
};
