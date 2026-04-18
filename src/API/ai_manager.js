import { config } from '../config.js';
import Logger from '../utils/logger.js';

const GOOGLE_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemma-4'];
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
];
const OPENROUTER_MODELS = [
    'qwen/qwen-3.6-preview:free',
    'meta-llama/llama-4-maverick:free',
    'meta-llama/llama-4-scout:free',
    'openrouter/hunter-alpha:free',
    'openrouter/healer-alpha:free',
];

/**
 * Helper to handle AI fetch responses and check for JSON.
 */
async function handleAIResponse(response, provider, model) {
    if (!response.ok) {
        const text = await response.text();
        Logger.error(
            `AI Provider Error (${provider} - ${model}): Status ${response.status}. Response: ${text.slice(0, 100)}...`
        );
        throw new Error(`AI Provider ${provider} (${model}) returned an error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        Logger.error(
            `AI Provider ${provider} (${model}) expected JSON but got: ${contentType}. Content preview: ${text.slice(0, 100)}...`
        );
        throw new Error(
            `AI Provider ${provider} (${model}) returned HTML instead of JSON. This usually means a limit was hit or the service is down.`
        );
    }

    return response.json();
}

/**
 * Melakukan pencarian file yang paling relevan menggunakan AI dengan sistem fallback.
 * @param {string} query Query pencarian user.
 * @param {Map<string, string>} files Map berisi filename dan kontennya.
 * @returns {Promise<string|null>} Nama file yang paling relevan atau null jika tidak ditemukan.
 */
export async function findRelevantFileWithAI(query, files) {
    if (files.size === 0) return null;

    // Persiapkan data file untuk prompt
    let fileContext = '';
    for (const [name, content] of files.entries()) {
        fileContext += `--- FILENAME: ${name} ---\n${content.slice(0, 1000)}\n\n`; // Ambil 1000 karakter pertama saja untuk efisiensi token
    }

    const prompt = `User is searching for: "${query}". 
Identify which of the following Markdown files is the most relevant to the query by scanning its content. 
Return ONLY the exact filename (including .md) from the list provided. 
If no file is relevant, return "none".

List of Files:
${fileContext}`;

    // Fallback order: Gemini -> Groq -> OpenRouter
    const providers = [
        { name: 'Gemini', fn: tryGemini },
        { name: 'Groq', fn: tryGroq },
        { name: 'OpenRouter', fn: tryOpenRouter },
    ];

    for (const provider of providers) {
        try {
            Logger.info(`[AI Search] Trying ${provider.name}...`);
            const result = await provider.fn(prompt);
            if (result && result !== 'none') {
                // Pastikan result ada di daftar file kita
                const matchedFile = Array.from(files.keys()).find(
                    (f) => f.toLowerCase() === result.toLowerCase() || result.includes(f)
                );
                if (matchedFile) return matchedFile;
            }
            if (result === 'none') return null;
        } catch (error) {
            Logger.error(`[AI Search] ${provider.name} failed:`, error.message);
            // Lanjut ke provider berikutnya
        }
    }

    throw new Error('All providers reached their limits.');
}

/**
 * Mendeteksi bahasa dari sebuah teks menggunakan AI.
 * @param {string} text Teks yang akan dideteksi bahasanya.
 * @param {string[]} supportedLanguages Daftar bahasa yang didukung.
 * @returns {Promise<string|null>} Nama bahasa yang terdeteksi atau null.
 */
export async function detectLanguageWithAI(text, supportedLanguages) {
    const prompt = `Text: "${text}"
Based on the text above, identify which of the following languages it is written in. 
Return ONLY the exact name of the language from the provided list. 
If unsure, return "English (US)".

List of Languages:
${supportedLanguages.join(', ')}`;

    // Fallback order: Gemini -> Groq -> OpenRouter
    const providers = [
        { name: 'Gemini', fn: tryGemini },
        { name: 'Groq', fn: tryGroq },
        { name: 'OpenRouter', fn: tryOpenRouter },
    ];

    for (const provider of providers) {
        try {
            Logger.info(`[AI Detection] Trying ${provider.name}...`);
            const result = await provider.fn(prompt);
            if (result && supportedLanguages.includes(result)) {
                return result;
            }
        } catch (error) {
            Logger.error(`[AI Detection] ${provider.name} failed:`, error.message);
        }
    }

    return 'English (US)'; // Default fallback
}

/**
 * Mengonversi nama bahasa (mungkin dalam bahasa asing seperti "inggris") ke nama resmi di daftar kita.
 * @param {string} inputName Nama bahasa yang diinput user.
 * @param {string[]} supportedLanguages Daftar bahasa resmi.
 * @returns {Promise<string|null>} Nama resmi atau null.
 */
export async function resolveLanguageNameWithAI(inputName, supportedLanguages) {
    const prompt = `The user wants to set their language to: "${inputName}".
    Identify which of the following official language names they are referring to.
    Return ONLY the exact name from the provided list.
    If no match is found or you are unsure, return "none".

    List of Official Languages:
    ${supportedLanguages.join(', ')}`;

    // Fallback order: Gemini -> Groq -> OpenRouter
    const providers = [
        { name: 'Gemini', fn: tryGemini },
        { name: 'Groq', fn: tryGroq },
        { name: 'OpenRouter', fn: tryOpenRouter },
    ];

    for (const provider of providers) {
        try {
            Logger.info(`[AI Resolution] Trying ${provider.name} for "${inputName}"...`);
            const result = await provider.fn(prompt);
            if (result && supportedLanguages.includes(result)) {
                return result;
            }
            if (result === 'none') return null;
        } catch (error) {
            Logger.error(`[AI Resolution] ${provider.name} failed:`, error.message);
        }
    }

    return null;
}

async function tryGemini(prompt) {
    for (const model of GOOGLE_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });

            const data = await handleAIResponse(response, 'Gemini', model);
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        } catch (err) {
            Logger.warn(`Gemini model ${model} failed, trying next...`);
        }
    }
    throw new Error('All Gemini models failed.');
}

async function tryGroq(prompt) {
    for (const model of GROQ_MODELS) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.groqApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await handleAIResponse(response, 'Groq', model);
            return data.choices?.[0]?.message?.content?.trim();
        } catch (err) {
            Logger.warn(`Groq model ${model} failed, trying next...`);
        }
    }
    throw new Error('All Groq models failed.');
}

async function tryOpenRouter(prompt) {
    for (const model of OPENROUTER_MODELS) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.openrouterApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await handleAIResponse(response, 'OpenRouter', model);
            return data.choices?.[0]?.message?.content?.trim();
        } catch (err) {
            Logger.warn(`OpenRouter model ${model} failed, trying next...`);
        }
    }
    throw new Error('All OpenRouter models failed.');
}
