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
                    name: 'Riset & Literasi',
                    value: 'Akses cepat ke **arXiv** (makalah ilmiah), **Wikipedia**, dan **Open Library** (buku).',
                    inline: false,
                },
                {
                    name: 'Developer Tools',
                    value: 'Pencarian dan download langsung **Nerd Fonts** untuk kustomisasi terminal/IDE.',
                    inline: false,
                },
                {
                    name: 'Teknologi',
                    value: 'Dibangun dengan **Node.js (Discord.js v14)** dan **Python** untuk pemrosesan data.',
                    inline: false,
                }
            )
            .setFooter({
                text: 'OpenZero Project • Searching Open Data',
                iconURL: message.client.user.displayAvatarURL(),
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
