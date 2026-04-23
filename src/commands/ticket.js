import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
} from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder().setName('ticket').setDescription('Ticket system setup'),
    async execute(context) {
        const guildId = context.guild?.id;
        if (!context.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const noPerms = await t('commands.ticket.no_perms_setup', {}, guildId);
            return context.reply({ content: noPerms, ephemeral: true });
        }

        const embed = new OpenZeroEmbed({}, context)
            .setTitle(await t('commands.ticket.setup_title', {}, guildId))
            .setDescription(await t('commands.ticket.setup_desc', {}, guildId));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel(await t('commands.ticket.setup_btn', {}, guildId))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        await context.channel.send({
            embeds: [embed],
            components: [row],
        });

        if (context.isChatInputCommand?.()) {
            await context.reply({
                content: await t('commands.ticket.setup_success', {}, guildId),
                ephemeral: true,
            });
        } else {
            if (context.deletable) {
                context.delete().catch(() => {});
            }
        }
    },
};
