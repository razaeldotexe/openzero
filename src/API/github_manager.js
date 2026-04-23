import { OpenZeroEmbed } from '../utils/embed.js';
import { config } from '../config.js';
import { APIClient } from './api_client.js';
import Logger from '../utils/logger.js';

/**
 * Memproses konten Markdown menjadi array Discord Embeds.
 */
function processMarkdownToEmbeds(content, fileName) {
    let body = content;
    let footerText = config.metadata.footerText;
    let title = fileName.replace('.md', '');

    const footerRegex = config.metadata.redditCleanupRegex;
    const footerMatch = body.match(footerRegex);
    if (footerMatch) {
        footerText = footerMatch[0].replace(/\[|\]/g, '').replace(/\(https?:\/\/.*\)/g, '');
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
        const embed = new OpenZeroEmbed()
            .setTitle(idx === 1 ? title : `${title} (Bagian ${idx})`)
            .setFooter({ text: footerText });

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
    const { githubRepoOwner, githubRepoName, githubToken } = config;

    try {
        const files = await APIClient.post('/github/scan', {
            owner: githubRepoOwner,
            repo: githubRepoName,
            token: githubToken,
            path: '',
        });

        const rawResults = new Map();

        await Promise.all(
            files.map(async (file) => {
                const fileData = await APIClient.post('/github/content', {
                    owner: githubRepoOwner,
                    repo: githubRepoName,
                    token: githubToken,
                    path: file.path,
                });

                if (fileData.content) {
                    rawResults.set(file.name, fileData.content);
                }
            })
        );

        return rawResults;
    } catch (error) {
        Logger.error('Error in fetchAllTutorialsRaw:', error.message);
        throw error;
    }
}

export async function fetchAllTutorialsEmbeds() {
    const { githubRepoOwner, githubRepoName, githubToken } = config;

    try {
        const files = await APIClient.post('/github/scan', {
            owner: githubRepoOwner,
            repo: githubRepoName,
            token: githubToken,
            path: '',
        });

        const allResults = new Map();

        await Promise.all(
            files.map(async (file) => {
                const fileData = await APIClient.post('/github/content', {
                    owner: githubRepoOwner,
                    repo: githubRepoName,
                    token: githubToken,
                    path: file.path,
                });

                if (fileData.content) {
                    const embeds = processMarkdownToEmbeds(fileData.content, file.name);
                    allResults.set(file.name, embeds);
                }
            })
        );

        return allResults;
    } catch (error) {
        Logger.error('Error in fetchAllTutorialsEmbeds:', error.message);
        throw error;
    }
}
