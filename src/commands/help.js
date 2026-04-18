import { EmbedBuilder } from 'discord.js';
import { t } from '../utils/i18n.js';

export default {
    name: 'help',
    aliases: ['?'],
    description: t('commands.help.description'),
    async execute(message) {
        const { commands } = message.client;

        // Menggunakan Set untuk memastikan perintah unik
        const uniqueCommands = Array.from(new Set(commands.values()));

        const embed = new EmbedBuilder()
            .setColor('#20f0f2')
            .setTitle(t('commands.help.title'))
            .setDescription(t('commands.help.desc_text'))
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({
                text: t('commands.help.footer', { username: message.author.username }),
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        uniqueCommands.forEach((command) => {
            const name = command.name;
            const aliases = command.aliases
                ? ` (${t('commands.help.alias')}: ${command.aliases.map((a) => `!${a}`).join(', ')})`
                : '';

            // Try to find localized description, fallback to command's static description
            const description =
                t(`commands.${name}.description`) ||
                command.description ||
                t('commands.help.no_desc');

            // Logika sederhana untuk menentukan contoh penggunaan
            let usage = `!${name}`;
            if (name === 'nerdfont') usage += ' [query/kosong]';
            else if (name === 'ping' || name === 'help') usage += '';
            else usage += ' [kata kunci]';

            embed.addFields({
                name: `!${name}${aliases}`,
                value: `${description}\n${t('commands.help.example')}: \`${usage}\``,
                inline: false,
            });
        });

        return message.reply({ embeds: [embed] });
    },
};
