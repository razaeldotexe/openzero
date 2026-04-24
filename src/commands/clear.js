import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Deletes a specified number of messages')
        .addIntegerOption((option) =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
        ),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();

        if (!context.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(await t('commands.clear.no_perms', {}, guildId));
            return context.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        let amount;
        if (isInteraction) {
            amount = context.options.getInteger('amount');
        } else {
            amount = parseInt(args[0]);
        }

        if (isNaN(amount) || amount < 1 || amount > 100) {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.error_title', {}, guildId))
                .setDescription(await t('commands.clear.invalid', {}, guildId));
            return context.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await context.channel.bulkDelete(amount, true);

        const embed = new OpenZeroEmbed({}, context)
            .setTitle(await t('common.success', {}, guildId))
            .setDescription(await t('commands.clear.success', { amount }, guildId));

        return context.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
