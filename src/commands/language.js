import { EmbedBuilder } from 'discord.js';
import { SUPPORTED_LANGUAGES } from '../utils/languages.js';
import { getLanguage, setLanguage, t } from '../utils/i18n.js';
import { detectLanguageWithAI, resolveLanguageNameWithAI } from '../API/ai_manager.js';
import Logger from '../utils/logger.js';

export default {
    name: 'language',
    aliases: ['lang', 'bahasa'],
    description: t('commands.language.description'),
    async execute(message, args) {
        if (!args.length) {
            const currentLang = getLanguage();
            return message.reply(t('commands.language.current', { lang: currentLang }));
        }

        const subCommand = args[0].toLowerCase();

        if (subCommand === 'list') {
            const embed = new EmbedBuilder()
                .setColor('#20f0f2')
                .setTitle(t('commands.language.list_title'))
                .setDescription(SUPPORTED_LANGUAGES.join(', '))
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'set') {
            const langName = args.slice(1).join(' ');
            if (!langName) return message.reply(t('commands.language.set_prompt'));

            // 1. Coba match langsung dulu (case insensitive)
            let matchedLang = SUPPORTED_LANGUAGES.find(
                (l) => l.toLowerCase() === langName.toLowerCase()
            );

            let loadingMsg = null;

            // 2. Jika tidak ketemu, coba gunakan AI untuk resolve (misal: "inggris" -> "English (US)")
            if (!matchedLang) {
                loadingMsg = await message.reply(t('common.loading'));
                try {
                    matchedLang = await resolveLanguageNameWithAI(langName, SUPPORTED_LANGUAGES);
                } catch (error) {
                    Logger.error('AI Language Resolution failed:', error);
                    return loadingMsg.edit(t('common.error', { error: error.message }));
                }
            }

            if (!matchedLang) {
                const errorMsg = t('commands.language.invalid');
                if (loadingMsg) return loadingMsg.edit(errorMsg);
                return message.reply(errorMsg);
            }

            setLanguage(matchedLang);
            const successMsg = t('commands.language.set_success', { lang: matchedLang });
            if (loadingMsg) return loadingMsg.edit(successMsg);
            return message.reply(successMsg);
        }

        if (subCommand === 'auto') {
            const textToDetect = args.slice(1).join(' ');
            if (!textToDetect) return message.reply(t('commands.language.auto_prompt'));

            const loadingMsg = await message.reply(t('commands.language.auto_detecting'));

            try {
                const detectedLang = await detectLanguageWithAI(textToDetect, SUPPORTED_LANGUAGES);
                if (detectedLang) {
                    setLanguage(detectedLang);
                    return loadingMsg.edit(
                        t('commands.language.auto_success', { lang: detectedLang })
                    );
                }
            } catch (error) {
                Logger.error('Language Detection Error:', error);
                return loadingMsg.edit(t('common.error', { error: error.message }));
            }
        }

        return message.reply(t('commands.language.usage_hint'));
    },
};
