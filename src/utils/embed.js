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
}

export default OpenZeroEmbed;
