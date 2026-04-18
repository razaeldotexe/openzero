import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { config } from '../config.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

/**
 * Helper to handle fetch responses and check for JSON.
 */
async function handleFetchResponse(response, context = '') {
    if (!response.ok) {
        const text = await response.text();
        Logger.error(
            `API Error (${context}): Status ${response.status}. Response: ${text.slice(0, 100)}...`
        );
        throw new Error(`API service returned an error: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        Logger.error(
            `Expected JSON but got: ${contentType} in ${context}. Content preview: ${text.slice(0, 100)}...`
        );
        throw new Error('API returned HTML instead of JSON. Check if your API_URL is correct.');
    }
    return response.json();
}

const API_HEADERS = {
    'User-Agent': 'OpenZeroBot/1.0 (DiscordBot; +https://github.com/razaeldotexe/open-0)',
};

export default {
    name: 'nerdfont',
    aliases: ['nf'],
    description: t('commands.nerdfont.description'),
    async execute(message, args) {
        if (!args.length) {
            return message.reply(t('commands.nerdfont.query_required'));
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply(t('common.loading'));

        try {
            const response = await fetch(
                `${config.apiUrl}/nerdfont?q=${encodeURIComponent(query)}`,
                {
                    headers: API_HEADERS,
                }
            );
            const data = await handleFetchResponse(response, 'NerdFont Search');

            if (data.error) {
                return loadingMsg.edit(data.error);
            }

            if (!Array.isArray(data) || data.length === 0) {
                return loadingMsg.edit(t('commands.nerdfont.no_results', { query }));
            }

            const fonts = data;
            let currentIdx = 0;

            const createEmbed = (idx) => {
                const font = fonts[idx];
                return new EmbedBuilder()
                    .setColor('#20f0f2')
                    .setTitle(font.patchedName)
                    .setDescription(
                        `${t('commands.nerdfont.font_family')}: **${font.unpatchedName}**`
                    )
                    .addFields(
                        {
                            name: t('commands.nerdfont.folder_name'),
                            value: font.folderName,
                            inline: true,
                        },
                        {
                            name: t('commands.nerdfont.download_link'),
                            value: `[${t('commands.nerdfont.click_to_download')}](${font.downloadUrl})`,
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: t('commands.nerdfont.footer', {
                            current: idx + 1,
                            total: fonts.length,
                        }),
                    })
                    .setTimestamp();
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_font')
                        .setLabel(t('commands.nerdfont.prev'))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_font')
                        .setLabel(t('commands.nerdfont.next'))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(idx === fonts.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (fonts.length > 1) {
                options.components = [createButtons(0)];
            }

            const responseMsg = await loadingMsg.edit(options);

            if (fonts.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 60000,
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({
                            content: t('common.access_denied'),
                            ephemeral: true,
                        });
                    }

                    if (interaction.customId === 'prev_font') currentIdx--;
                    else if (interaction.customId === 'next_font') currentIdx++;

                    await interaction.update({
                        embeds: [createEmbed(currentIdx)],
                        components: [createButtons(currentIdx)],
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('done')
                            .setLabel(t('commands.nerdfont.finished'))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }
        } catch (error) {
            Logger.error('NerdFont Error:', error.message);
            loadingMsg.edit(t('common.error', { error: error.message }));
        }
    },
};
