import { t } from '../utils/i18n.js';

export default {
    name: 'ping',
    description: t('commands.ping.description'),
    execute(message) {
        message.reply(t('commands.ping.reply'));
    },
};
