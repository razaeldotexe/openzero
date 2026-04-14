import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import Logger from '../utils/logger.js';

/**
 * Memproses konten Markdown menjadi array Discord Embeds.
 */
function processMarkdownToEmbeds(content, fileName) {
    let body = content;
    let footerText = 'OpenZero Resource';
    let title = fileName.replace('.md', '');

    const footerRegex =
        /submitted to \[r\/MorpheApp\]\(https:\/\/www\.reddit\.com\/r\/MorpheApp\) by \[u\/HundEdFeteTree\]\(https:\/\/www\.reddit\.com\/user\/HundEdFeteTree\)/i;
    const footerMatch = body.match(footerRegex);
    if (footerMatch) {
        footerText = 'Submitted to r/MorpheApp by u/HundEdFeteTree';
        body = body.replace(footerRegex, '').trim();
    }

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

export async function fetchAllTutorialsRaw() {
    const { githubRepoOwner, githubRepoName, githubToken, apiUrl } = config;

    try {
        const response = await fetch(`${apiUrl}/github/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner: githubRepoOwner,
                repo: githubRepoName,
                token: githubToken,
                path: '',
            }),
        });

        const files = await response.json();
        if (files.error) throw new Error(files.error);

        const rawResults = new Map();

        for (const file of files) {
            const contentResp = await fetch(`${apiUrl}/github/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: githubRepoOwner,
                    repo: githubRepoName,
                    token: githubToken,
                    path: file.path,
                }),
            });
            const fileData = await contentResp.json();
            if (fileData.content) {
                rawResults.set(file.name, fileData.content);
            }
        }

        return rawResults;
    } catch (error) {
        Logger.error('Error fetching raw tutorials from Flask API:', error);
        throw error;
    }
}

export async function fetchAllTutorialsEmbeds() {
    const { githubRepoOwner, githubRepoName, githubToken, apiUrl } = config;

    try {
        const response = await fetch(`${apiUrl}/github/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner: githubRepoOwner,
                repo: githubRepoName,
                token: githubToken,
                path: '',
            }),
        });

        const files = await response.json();
        if (files.error) throw new Error(files.error);

        const allResults = new Map();

        for (const file of files) {
            const contentResp = await fetch(`${apiUrl}/github/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: githubRepoOwner,
                    repo: githubRepoName,
                    token: githubToken,
                    path: file.path,
                }),
            });
            const fileData = await contentResp.json();
            if (fileData.content) {
                const embeds = processMarkdownToEmbeds(fileData.content, file.name);
                allResults.set(file.name, embeds);
            }
        }

        return allResults;
    } catch (error) {
        Logger.error('Error fetching tutorials embeds from Flask API:', error);
        throw error;
    }
}
