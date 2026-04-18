import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from './logger.js';
import { LANGUAGE_MAP } from './languages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_PATH = path.join(__dirname, '../../settings.json');
const LOCALES_PATH = path.join(__dirname, '../locales');

let currentLanguage = 'Indonesian';
const locales = {};

/**
 * Load all locale files from src/locales.
 */
function loadLocales() {
    try {
        if (!fs.existsSync(LOCALES_PATH)) {
            fs.mkdirSync(LOCALES_PATH, { recursive: true });
        }
        const files = fs.readdirSync(LOCALES_PATH).filter((f) => f.endsWith('.json'));
        files.forEach((file) => {
            const langCode = file.replace('.json', '');
            const content = fs.readFileSync(path.join(LOCALES_PATH, file), 'utf-8');
            locales[langCode] = JSON.parse(content);
        });
    } catch (error) {
        Logger.error('Failed to load locales:', error);
    }
}

/**
 * Get current language from settings.json or default.
 */
export function getLanguage() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
            if (settings.language) {
                currentLanguage = settings.language;
            }
        }
    } catch (error) {
        Logger.error('Error reading settings.json:', error);
    }
    return currentLanguage;
}

/**
 * Set current language and save to settings.json.
 */
export function setLanguage(lang) {
    currentLanguage = lang;
    try {
        const settings = fs.existsSync(SETTINGS_PATH)
            ? JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
            : {};
        settings.language = lang;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 4));
    } catch (error) {
        Logger.error('Error saving settings.json:', error);
    }
}

/**
 * Translate a key based on the current language.
 * @param {string} key Key in dot notation (e.g., 'commands.ping.reply')
 * @param {Object} params Parameters to replace in the string
 * @returns {string}
 */
export function t(key, params = {}) {
    const lang = getLanguage();
    // Use Indonesian as base if not found, or English if fallback needed.
    const langCode = LANGUAGE_MAP[lang] || 'en-US';
    let text =
        getKey(locales[langCode], key) ||
        getKey(locales['en-US'], key) ||
        getKey(locales['id'], key) ||
        key;

    // Replace params
    Object.keys(params).forEach((p) => {
        text = text.replace(`{${p}}`, params[p]);
    });

    return text;
}

function getKey(obj, key) {
    if (!obj) return null;
    return key.split('.').reduce((o, i) => (o ? o[i] : null), obj);
}

// Initial load
loadLocales();
