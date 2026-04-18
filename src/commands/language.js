import { EmbedBuilder } from 'discord.js';
import { SUPPORTED_LANGUAGES } from '../utils/languages.js';
import { getLanguage, setLanguage, t } from '../utils/i18n.js';
import { detectLanguageWithAI } from '../API/ai_manager.js';
import Logger from '../utils/logger.js';

export default {
    name: 'language',
    aliases: ['lang', 'bahasa'],
    description: 'Mengatur bahasa bot (Set language of the bot)',
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
            if (!langName)
                return message.reply(
                    'Mohon berikan nama bahasa. Contoh: `!language set English (US)`'
                );

            // Find match (case insensitive)
            const matchedLang = SUPPORTED_LANGUAGES.find(
                (l) => l.toLowerCase() === langName.toLowerCase()
            );

            if (!matchedLang) {
                return message.reply(t('commands.language.invalid'));
            }

            setLanguage(matchedLang);
            return message.reply(t('commands.language.set_success', { lang: matchedLang }));
        }

        if (subCommand === 'auto') {
            const textToDetect = args.slice(1).join(' ');
            if (!textToDetect)
                return message.reply(
                    'Mohon berikan teks untuk dideteksi. Contoh: `!language auto Hello, how are you?`'
                );

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

        return message.reply(
            'Gunakan `!language set <nama bahasa>`, `!language list`, atau `!language auto <teks>`.'
        );
    },
};
