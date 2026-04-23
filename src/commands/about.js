import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import { config } from '../config.js';

export default {
    data: new SlashCommandBuilder().setName('about').setDescription('Bot information'),
    async execute(context) {
        const guildId = context.guild?.id;
        const embed = new OpenZeroEmbed()
            .setTitle(await t('commands.about.title', {}, guildId))
            .setThumbnail(context.client.user.displayAvatarURL())
            .setDescription(await t('commands.about.desc', {}, guildId))
            .addFields(
                {
                    name: await t('commands.about.field_research_title', {}, guildId),
                    value: await t('commands.about.field_research_value', {}, guildId),
                    inline: false,
                },
                {
                    name: await t('commands.about.field_dev_title', {}, guildId),
                    value: await t('commands.about.field_dev_value', {}, guildId),
                    inline: false,
                },
                {
                    name: await t('commands.about.field_tech_title', {}, guildId),
                    value: await t('commands.about.field_tech_value', {}, guildId),
                    inline: false,
                }
            )
            .setFooter({
                text: await t('commands.about.footer', {}, guildId),
                iconURL: context.client.user.displayAvatarURL(),
            });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(await t('common.help_translate', {}, guildId))
                .setStyle(ButtonStyle.Link)
                .setURL(config.translationUrl)
        );

        return context.reply({ embeds: [embed], components: [row] });
    },
};
