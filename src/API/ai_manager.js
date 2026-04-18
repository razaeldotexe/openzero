import { config } from '../config.js';
import Logger from '../utils/logger.js';

/**
 * Helper to handle AI fetch responses and check for JSON.
 */
async function handleAIResponse(response, provider) {
    if (!response.ok) {
        const text = await response.text();
        Logger.error(
            `AI Provider Error (${provider}): Status ${response.status}. Response: ${text.slice(0, 100)}...`
        );
        throw new Error(`AI Provider ${provider} returned an error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        Logger.error(
            `AI Provider ${provider} expected JSON but got: ${contentType}. Content preview: ${text.slice(0, 100)}...`
        );
        throw new Error(
            `AI Provider ${provider} returned HTML instead of JSON. This usually means a limit was hit or the service is down.`
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

async function tryGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    const data = await handleAIResponse(response, 'Gemini');
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function tryGroq(prompt) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    const data = await handleAIResponse(response, 'Groq');
    return data.choices?.[0]?.message?.content?.trim();
}

async function tryOpenRouter(prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.openrouterApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    const data = await handleAIResponse(response, 'OpenRouter');
    return data.choices?.[0]?.message?.content?.trim();
}
