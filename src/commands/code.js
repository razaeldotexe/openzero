import { SlashCommandBuilder } from 'discord.js';
import { APIClient } from '../API/api_client.js';
import { OpenZeroEmbed } from '../utils/embed.js';
import { t, getLanguage } from '../utils/i18n.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('code')
        .setDescription('AI-powered developer tools')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('explain')
                .setDescription('Explain a code snippet')
                .addStringOption((option) =>
                    option.setName('code').setDescription('The code to explain').setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('language')
                        .setDescription('Programming language')
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('debug')
                .setDescription('Debug a code snippet')
                .addStringOption((option) =>
                    option.setName('code').setDescription('The code to debug').setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName('error').setDescription('The error message').setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('generate')
                .setDescription('Generate code from a prompt')
                .addStringOption((option) =>
                    option
                        .setName('prompt')
                        .setDescription('What code to generate?')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('language')
                        .setDescription('Programming language')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('framework')
                        .setDescription('Framework (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('refactor')
                .setDescription('Refactor a code snippet')
                .addStringOption((option) =>
                    option.setName('code').setDescription('The code to refactor').setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('instruction')
                        .setDescription('Specific instruction')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        if (!interaction.isChatInputCommand?.()) {
            return interaction.reply('This command only supports slash commands.');
        }

        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();
        const lang = await getLanguage(guildId);

        await interaction.deferReply();

        try {
            let result;
            let title;

            if (subcommand === 'explain') {
                const code = interaction.options.getString('code');
                const language = interaction.options.getString('language');
                const data = await APIClient.post('/code/explain', { code, language, lang });
                result = data.explanation;
                title = 'Code Explanation';
            } else if (subcommand === 'debug') {
                const code = interaction.options.getString('code');
                const error = interaction.options.getString('error');
                const data = await APIClient.post('/code/debug', { code, error, lang });
                result = data.fix;
                title = 'Bug Fix & Analysis';
            } else if (subcommand === 'generate') {
                const prompt = interaction.options.getString('prompt');
                const language = interaction.options.getString('language');
                const framework = interaction.options.getString('framework');
                const data = await APIClient.post('/code/generate', {
                    prompt,
                    language,
                    framework,
                    lang,
                });
                result = data.code;
                title = 'Generated Code';
            } else if (subcommand === 'refactor') {
                const code = interaction.options.getString('code');
                const instruction = interaction.options.getString('instruction');
                const data = await APIClient.post('/code/refactor', { code, instruction, lang });
                result = data.refactoredCode;
                title = 'Refactored Code';
            }

            const user = interaction.user;
            const embed = new OpenZeroEmbed({}, interaction)
                .setStandardLayout(user, '/code ' + subcommand, title)
                .setDescription(`${result.substring(0, 4000)} `);

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            Logger.error(`Code command (${subcommand}) error:`, error);
            const errorMsg = await t('common.error', { error: error.message }, guildId);
            return interaction.editReply(errorMsg);
        }
    },
};
