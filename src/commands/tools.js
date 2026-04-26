import { SlashCommandBuilder } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('tools')
        .setDescription('Deterministic automation tools (JSON, Format, Crypto, URL, Time)')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('json')
                .setDescription('JSON utilities (prettify, minify, validate, diff)')
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Prettify', value: 'prettify' },
                            { name: 'Minify', value: 'minify' },
                            { name: 'Validate', value: 'validate' },
                            { name: 'Diff', value: 'diff' }
                        )
                )
                .addStringOption((option) =>
                    option.setName('input').setDescription('JSON input').setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('input2')
                        .setDescription('Second JSON input (for diff)')
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('format')
                .setDescription('Code formatter using Prettier')
                .addStringOption((option) =>
                    option
                        .setName('language')
                        .setDescription('Programming language')
                        .setRequired(true)
                        .addChoices(
                            { name: 'JavaScript', value: 'javascript' },
                            { name: 'TypeScript', value: 'typescript' },
                            { name: 'JSON', value: 'json' },
                            { name: 'HTML', value: 'html' },
                            { name: 'CSS', value: 'css' }
                        )
                )
                .addStringOption((option) =>
                    option.setName('code').setDescription('Code to format').setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('crypto')
                .setDescription('Hash and Encode utilities')
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hash', value: 'hash' },
                            { name: 'Encode', value: 'encode' },
                            { name: 'Decode', value: 'decode' }
                        )
                )
                .addStringOption((option) =>
                    option
                        .setName('type')
                        .setDescription('Hash/Encoding type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'MD5', value: 'md5' },
                            { name: 'SHA256', value: 'sha256' },
                            { name: 'Base64', value: 'base64' }
                        )
                )
                .addStringOption((option) =>
                    option.setName('input').setDescription('Input text').setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('url')
                .setDescription('URL utilities')
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Parse', value: 'parse' },
                            { name: 'Encode', value: 'encode' },
                            { name: 'Decode', value: 'decode' }
                        )
                )
                .addStringOption((option) =>
                    option.setName('input').setDescription('URL or text').setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('time')
                .setDescription('Timestamp and date utilities')
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Now', value: 'now' },
                            { name: 'Convert', value: 'convert' }
                        )
                )
                .addStringOption((option) =>
                    option
                        .setName('input')
                        .setDescription('Date or Timestamp (optional for now)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        if (!interaction.isChatInputCommand?.()) return;

        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();

        try {
            let result;
            let title;
            let displayResult = '';

            if (subcommand === 'json') {
                const action = interaction.options.getString('action');
                const input = interaction.options.getString('input');
                const input2 = interaction.options.getString('input2');
                const data = await APIClient.post('/tools/json', { action, input, input2 });
                title = await t('commands.tools.json_title', {}, guildId);

                if (action === 'validate') {
                    displayResult = data.result.valid
                        ? '✅ Valid JSON'
                        : `❌ Invalid JSON: ${data.result.error}`;
                } else if (action === 'diff') {
                    displayResult = `Equal: ${data.result.equal}\n\`\`\`json\n${JSON.stringify(data.result.changes, null, 2)}\n\`\`\``;
                } else {
                    displayResult = `\`\`\`json\n${data.result}\n\`\`\``;
                }
            } else if (subcommand === 'format') {
                const language = interaction.options.getString('language');
                const code = interaction.options.getString('code');
                const data = await APIClient.post('/tools/format', { language, code });
                title = await t('commands.tools.format_title', {}, guildId);
                displayResult = `\`\`\`${language}\n${data.result}\n\`\`\``;
            } else if (subcommand === 'crypto') {
                const action = interaction.options.getString('action');
                const type = interaction.options.getString('type');
                const input = interaction.options.getString('input');
                const data = await APIClient.post('/tools/crypto', { action, type, input });
                title = await t('commands.tools.crypto_title', {}, guildId);
                displayResult = `**${action.toUpperCase()} (${type})**:\n\`${data.result}\``;
            } else if (subcommand === 'url') {
                const action = interaction.options.getString('action');
                const input = interaction.options.getString('input');
                const data = await APIClient.post('/tools/url', { action, input });
                title = await t('commands.tools.url_title', {}, guildId);

                if (action === 'parse') {
                    displayResult = `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
                } else {
                    displayResult = `\`${data.result}\``;
                }
            } else if (subcommand === 'time') {
                const action = interaction.options.getString('action');
                const input = interaction.options.getString('input');
                const data = await APIClient.post('/tools/time', {
                    action,
                    input: input || undefined,
                });
                title = await t('commands.tools.time_title', {}, guildId);
                displayResult = `**ISO**: \`${data.iso}\`\n**Unix**: \`${data.unix}\`\n**Readable**: \`${data.readable}\``;
            }

            const embed = new OpenZeroEmbed()
                .setStandardLayout(interaction.user, `/tools ${subcommand}`, title)
                .setDescription(displayResult.substring(0, 4000));

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            Logger.error(`Tools command (${subcommand}) error:`, error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return interaction.editReply(errorMsg);
        }
    },
};
