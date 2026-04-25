import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

/**
 * Standardized OpenZero Embed wrapper.
 * Extends EmbedBuilder to provide consistent branding and defaults.
 */
export class OpenZeroEmbed extends EmbedBuilder {
    /**
     * @param {import('discord.js').EmbedData} [data] - Initial embed data.
     * @param {import('discord.js').BaseInteraction|import('discord.js').Message} [context] - Context to extract bot icon.
     */
    constructor(data = {}, context = null) {
        super(data);

        // Set default brand color if not provided
        if (!this.data.color) {
            this.setColor('#58c2e6');
        }

        // Set default footer if not provided
        if (!this.data.footer) {
            const footerText = config.metadata?.footerText || 'OpenZero Resource';
            const footerIcon = context?.client?.user?.displayAvatarURL() || null;

            this.setFooter({
                text: footerText,
                iconURL: footerIcon,
            });
        }

        // Set default timestamp if not provided
        if (!this.data.timestamp) {
            this.setTimestamp();
        }
    }

    /**
     * Sets the standardized layout from the reference image.
     * @param {import('discord.js').User} user - The user who requested the command.
     * @param {string} commandName - The name of the command (e.g., '/arxiv').
     * @param {string} featureName - The title of the feature/result.
     */
    setStandardLayout(user, commandName, featureName) {
        this.setAuthor({
            name: `${user.username} Request: ${commandName}`,
            iconURL: user.displayAvatarURL(),
        });
        this.setTitle(featureName);
        return this;
    }

    /**
     * Adds an AI Summary section to the embed.
     * @param {string} summary - The AI-generated summary content.
     */
    setAISummary(summary) {
        if (!summary) return this;

        const currentDesc = this.data.description || '';
        const aiSection = `\n\n**AI Summary**\n${summary}`;

        this.setDescription(currentDesc + aiSection);
        return this;
    }
}

export default OpenZeroEmbed;
