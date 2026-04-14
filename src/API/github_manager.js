import { EmbedBuilder } from 'discord.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonScriptPath = path.join(__dirname, 'python', 'github_fetcher.py');

/**
 * Memproses konten Markdown menjadi array Discord Embeds.
 */
function processMarkdownToEmbeds(content, fileName) {
    let body = content;
    let footerText = 'OpenZero Resource';
    let title = fileName.replace('.md', '');

    // 1. Ekstrak Footer (pola "submitted to ... by ...")
    const footerRegex =
        /submitted to \[r\/MorpheApp\]\(https:\/\/www\.reddit\.com\/r\/MorpheApp\) by \[u\/HundEdFeteTree\]\(https:\/\/www\.reddit\.com\/user\/HundEdFeteTree\)/i;
    const footerMatch = body.match(footerRegex);
    if (footerMatch) {
        footerText = 'Submitted to r/MorpheApp by u/HundEdFeteTree';
        body = body.replace(footerRegex, '').trim();
    }

    // 2. Ekstrak Judul (# Judul)
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) {
            title = lines[i].replace('# ', '').trim();
            body = lines
                .slice(i + 1)
                .join('\n')
                .trim();
            break;
        }
    }

    // 3. Split Konten
    const embeds = [];
    const maxDescriptionLength = 4000;
    const paragraphs = body.split('\n');
    let currentChunk = '';
    let chunkIndex = 1;

    const createBaseEmbed = (idx) => {
        const embed = new EmbedBuilder()
            .setTitle(idx === 1 ? title : `${title} (Bagian ${idx})`)
            .setColor('#2dba4e')
            .setFooter({ text: footerText })
            .setTimestamp();

        if (idx === 1) {
            embed.setAuthor({
                name: 'GitHub Resource',
                iconURL:
                    'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            });
        }
        return embed;
    };

    if (body.length <= maxDescriptionLength) {
        embeds.push(createBaseEmbed(1).setDescription(body || 'Tidak ada konten.'));
    } else {
        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length + 1 > maxDescriptionLength) {
                embeds.push(createBaseEmbed(chunkIndex).setDescription(currentChunk || '...'));
                currentChunk = paragraph + '\n';
                chunkIndex++;
                if (embeds.length >= 10) break;
            } else {
                currentChunk += paragraph + '\n';
            }
        }
        if (currentChunk.length > 0 && embeds.length < 10) {
            embeds.push(createBaseEmbed(chunkIndex).setDescription(currentChunk));
        }
    }

    return embeds;
}

/**
 * Mengambil konten RAW dari semua file tutorial di folder tutorial/docs/guides.
 * @returns {Promise<Map<string, string>>} Map filename -> raw content.
 */
export async function fetchAllTutorialsRaw() {
    const { githubRepoOwner, githubRepoName, githubToken } = config;
    const tutorialPath = ''; // Scan from the root recursively

    try {
        const listCmd = `python "${pythonScriptPath}" "${githubRepoOwner}" "${githubRepoName}" "${githubToken || ''}" "${tutorialPath}" "false"`;
        const { stdout: listStdout } = await execPromise(listCmd);
        const files = JSON.parse(listStdout);

        if (files.error) throw new Error(files.error);

        const rawResults = new Map();

        for (const file of files) {
            const fetchCmd = `python "${pythonScriptPath}" "${githubRepoOwner}" "${githubRepoName}" "${githubToken || ''}" "${file.path}" "true"`;
            const { stdout: fetchStdout } = await execPromise(fetchCmd);
            const fileData = JSON.parse(fetchStdout);

            if (fileData.content) {
                rawResults.set(file.name, fileData.content);
            }
        }

        return rawResults;
    } catch (error) {
        console.error('Error fetching raw tutorials:', error);
        throw error;
    }
}

/**
 * Mengambil SEMUA file tutorial dari repo (dalam folder tutorial/)
 * dan mengembalikan Map<filename, EmbedBuilder[]>.
 */
export async function fetchAllTutorialsEmbeds() {
    const { githubRepoOwner, githubRepoName, githubToken } = config;
    const tutorialPath = ''; // Scan from the root of the repository recursively

    try {
        // 1. List files in 'tutorial/' folder
        const listCmd = `python "${pythonScriptPath}" "${githubRepoOwner}" "${githubRepoName}" "${githubToken || ''}" "${tutorialPath}" "false"`;
        const { stdout: listStdout } = await execPromise(listCmd);
        const files = JSON.parse(listStdout);

        if (files.error) throw new Error(files.error);

        const allResults = new Map();

        // 2. Fetch each file
        for (const file of files) {
            const fetchCmd = `python "${pythonScriptPath}" "${githubRepoOwner}" "${githubRepoName}" "${githubToken || ''}" "${file.path}" "true"`;
            const { stdout: fetchStdout } = await execPromise(fetchCmd);
            const fileData = JSON.parse(fetchStdout);

            if (fileData.content) {
                const embeds = processMarkdownToEmbeds(fileData.content, file.name);
                allResults.set(file.name, embeds);
            }
        }

        return allResults;
    } catch (error) {
        console.error('Error fetching all tutorials:', error);
        throw error;
    }
}
