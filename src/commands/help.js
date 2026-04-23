import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import { config } from '../config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands'),
    async execute(context) {
        const guildId = context.guild?.id;
        const user = context.user || context.author;
        const { commands } = context.client;

        // Ensure unique commands
        const uniqueCommands = Array.from(new Set(commands.values()));

        const embed = new OpenZeroEmbed({}, context)
            .setColor('#20f0f2')
            .setTitle(await t('commands.help.title', {}, guildId))
            .setDescription(await t('commands.help.desc_text', {}, guildId))
            .setThumbnail(context.client.user.displayAvatarURL())
            .setFooter({
                text: await t('commands.help.footer', { username: user.username }, guildId),
                iconURL: user.displayAvatarURL({ dynamic: true }),
            });

        for (const command of uniqueCommands) {
            const name = command.data?.name || command.name;
            const aliases = command.aliases
                ? ` (${await t('commands.help.alias', {}, guildId)}: ${command.aliases.map((a) => `!${a}`).join(', ')})`
                : '';

            const description =
                (await t(`commands.${name}.description`, {}, guildId)) ||
                command.description ||
                (await t('commands.help.no_desc', {}, guildId));

            let usage = `!${name}`;
            if (
                name === 'nerdfont' ||
                name === 'clear' ||
                name === 'product' ||
                name === 'appsearch' ||
                name === 'monitorapps'
            )
                usage += ' [query/source]';
            else if (name === 'webhook') usage += ' [name] [#channel] [avatar_url]';
            else if (name === 'kick' || name === 'ban') usage += ' @user [reason]';
            else if (name === 'ping' || name === 'help' || name === 'info') usage += '';
            else usage += ' [query]';

            embed.addFields({
                name: `!${name}${aliases}`,
                value: `${description}\n${await t('commands.help.example', {}, guildId)}: \`${usage}\``,
                inline: false,
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(await t('common.help_translate', {}, guildId))
                .setStyle(ButtonStyle.Link)
                .setURL(config.translationUrl)
        );

        return context.reply({ embeds: [embed], components: [row] });
    },
};
