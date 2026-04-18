import { EmbedBuilder } from 'discord.js';
import { t } from '../utils/i18n.js';

export default {
    name: 'about',
    description: t('commands.about.description'),
    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#20f0f2')
            .setTitle(t('commands.about.title'))
            .setThumbnail(message.client.user.displayAvatarURL())
            .setDescription(t('commands.about.desc'))
            .addFields(
                {
                    name: t('commands.about.field_research_title'),
                    value: t('commands.about.field_research_value'),
                    inline: false,
                },
                {
                    name: t('commands.about.field_dev_title'),
                    value: t('commands.about.field_dev_value'),
                    inline: false,
                },
                {
                    name: t('commands.about.field_tech_title'),
                    value: t('commands.about.field_tech_value'),
                    inline: false,
                }
            )
            .setFooter({
                text: t('commands.about.footer'),
                iconURL: message.client.user.displayAvatarURL(),
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
