import { SlashCommandBuilder } from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { SUPPORTED_LANGUAGES } from '../utils/languages.js';
import { getLanguage, setLanguage, t } from '../utils/i18n.js';
import { detectLanguageWithAI, resolveLanguageNameWithAI } from '../API/ai_manager.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Set bot language')
        .addSubcommand((sub) => sub.setName('list').setDescription('List of Supported Languages'))
        .addSubcommand((sub) =>
            sub
                .setName('set')
                .setDescription('Set language')
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('Language name (e.g. English, Indonesian)')
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('auto')
                .setDescription('Auto-detect language from text')
                .addStringOption((option) =>
                    option
                        .setName('text')
                        .setDescription('Text to detect language from')
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) => sub.setName('current').setDescription('Show current language')),
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();

        let subCommand;
        if (isInteraction) {
            subCommand = context.options.getSubcommand();
        } else {
            subCommand = args[0]?.toLowerCase();
        }

        if (!subCommand) {
            const currentLang = await getLanguage(guildId);
            const msg = await t('commands.language.current', { lang: currentLang }, guildId);
            const embed = new OpenZeroEmbed({}, context).setDescription(msg);
            return context.reply({ embeds: [embed] });
        }

        if (subCommand === 'list') {
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('commands.language.list_title', {}, guildId))
                .setDescription(SUPPORTED_LANGUAGES.join(', '));
            return context.reply({ embeds: [embed] });
        }

        if (subCommand === 'set' || subCommand === 'setting') {
            // Supporting 'setting' if used in prefix
            let langName;
            if (isInteraction) {
                langName = context.options.getString('name');
            } else {
                langName = args.slice(1).join(' ');
            }

            if (!langName) {
                const prompt = await t('commands.language.set_prompt', {}, guildId);
                const embed = new OpenZeroEmbed({}, context).setDescription(prompt);
                return context.reply({ embeds: [embed] });
            }

            // 1. Try direct match
            let matchedLang = SUPPORTED_LANGUAGES.find(
                (l) => l.toLowerCase() === langName.toLowerCase()
            );

            let loadingMsg = null;
            if (isInteraction) {
                await context.deferReply();
            }

            const editResponse = async (opts) => {
                if (isInteraction) return await context.editReply(opts);
                if (loadingMsg) return await loadingMsg.edit(opts);
                return await context.reply(opts);
            };

            // 2. Try AI resolve
            if (!matchedLang) {
                if (!isInteraction) {
                    const loadingText = await t('common.loading', {}, guildId);
                    const embed = new OpenZeroEmbed({}, context).setDescription(loadingText);
                    loadingMsg = await context.reply({ embeds: [embed] });
                }

                try {
                    matchedLang = await resolveLanguageNameWithAI(langName, SUPPORTED_LANGUAGES);
                } catch (error) {
                    Logger.error('AI Language Resolution failed:', error);
                    const errorText = await t('common.error', { error: error.message }, guildId);
                    const embed = new OpenZeroEmbed({}, context)
                        .setTitle(await t('common.error_title', {}, guildId))
                        .setDescription(errorText);
                    return await editResponse({ embeds: [embed] });
                }
            }

            if (!matchedLang) {
                const invalidMsg = await t('commands.language.invalid', {}, guildId);
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(invalidMsg);
                return await editResponse({ embeds: [embed] });
            }

            await setLanguage(guildId, matchedLang);
            const successMsg = await t(
                'commands.language.set_success',
                { lang: matchedLang },
                guildId
            );
            const embed = new OpenZeroEmbed({}, context)
                .setTitle(await t('common.success', {}, guildId))
                .setDescription(successMsg);
            return await editResponse({ embeds: [embed] });
        }

        if (subCommand === 'auto') {
            let textToDetect;
            if (isInteraction) {
                textToDetect = context.options.getString('text');
            } else {
                textToDetect = args.slice(1).join(' ');
            }

            if (!textToDetect) {
                const prompt = await t('commands.language.auto_prompt', {}, guildId);
                const embed = new OpenZeroEmbed({}, context).setDescription(prompt);
                return context.reply({ embeds: [embed] });
            }

            let loadingMsg = null;
            if (isInteraction) {
                await context.deferReply();
            } else {
                const detectingText = await t('commands.language.auto_detecting', {}, guildId);
                const embed = new OpenZeroEmbed({}, context).setDescription(detectingText);
                loadingMsg = await context.reply({ embeds: [embed] });
            }

            const editResponse = async (opts) => {
                if (isInteraction) return await context.editReply(opts);
                if (loadingMsg) return await loadingMsg.edit(opts);
                return await context.reply(opts);
            };

            try {
                const detectedLang = await detectLanguageWithAI(textToDetect, SUPPORTED_LANGUAGES);
                if (detectedLang) {
                    await setLanguage(guildId, detectedLang);
                    const successText = await t(
                        'commands.language.auto_success',
                        { lang: detectedLang },
                        guildId
                    );
                    const embed = new OpenZeroEmbed({}, context)
                        .setTitle(await t('common.success', {}, guildId))
                        .setDescription(successText);
                    return await editResponse({ embeds: [embed] });
                } else {
                    const invalidMsg = await t('commands.language.invalid', {}, guildId);
                    const embed = new OpenZeroEmbed({}, context)
                        .setTitle(await t('common.error_title', {}, guildId))
                        .setDescription(invalidMsg);
                    return await editResponse({ embeds: [embed] });
                }
            } catch (error) {
                Logger.error('Language Detection Error:', error);
                const errorText = await t('common.error', { error: error.message }, guildId);
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(await t('common.error_title', {}, guildId))
                    .setDescription(errorText);
                return await editResponse({ embeds: [embed] });
            }
        }

        if (subCommand === 'current') {
            const currentLang = await getLanguage(guildId);
            const msg = await t('commands.language.current', { lang: currentLang }, guildId);
            const embed = new OpenZeroEmbed({}, context).setDescription(msg);
            return context.reply({ embeds: [embed] });
        }

        const usageHint = await t('commands.language.usage_hint', {}, guildId);
        const embed = new OpenZeroEmbed({}, context).setDescription(usageHint);
        return context.reply({ embeds: [embed] });
    },
};
