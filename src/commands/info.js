import { SlashCommandBuilder } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Displays complete user information')
        .addUserOption((option) =>
            option.setName('target').setDescription('The user to get information about')
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();

        let target;
        if (isInteraction) {
            target = context.options.getMember('target') || context.member;
        } else {
            if (args.length > 0) {
                const userId = args[0].replace(/[<@!>]/g, '');
                target =
                    context.guild.members.cache.get(userId) ||
                    (await context.guild.members.fetch(userId).catch(() => null)) ||
                    context.member;
            } else {
                target = context.member;
            }
        }

        const roles =
            target.roles.cache
                .filter((role) => role.name !== '@everyone')
                .map((role) => role.toString())
                .join(', ') || (await t('commands.info.no_roles', {}, guildId));

        const embed = new OpenZeroEmbed({}, context)
            .setTitle(await t('commands.info.user_info', { tag: target.user.tag }, guildId))
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: await t('commands.info.user_id', {}, guildId),
                    value: target.id,
                    inline: true,
                },
                {
                    name: await t('commands.info.nickname', {}, guildId),
                    value: target.displayName,
                    inline: true,
                },
                {
                    name: await t('commands.info.account_created', {}, guildId),
                    value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`,
                    inline: true,
                },
                {
                    name: await t('commands.info.joined_server', {}, guildId),
                    value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
                    inline: true,
                },
                { name: `Roles [${target.roles.cache.size - 1}]`, value: roles }
            );

        return context.reply({ embeds: [embed] });
    },
};
