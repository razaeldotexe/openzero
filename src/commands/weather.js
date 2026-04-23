import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import OpenZeroEmbed from '../utils/embed.js';
import { APIClient } from '../API/api_client.js';
import Logger from '../utils/logger.js';
import { t } from '../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Check the weather for a city or coordinates')
        .addStringOption((option) =>
            option.setName('city').setDescription('The city name').setRequired(false)
        )
        .addNumberOption((option) =>
            option.setName('lat').setDescription('Latitude (optional)').setRequired(false)
        )
        .addNumberOption((option) =>
            option.setName('long').setDescription('Longitude (optional)').setRequired(false)
        ),
    aliases: ['w'],
    async execute(context, args) {
        const guildId = context.guild?.id;
        const isInteraction = context.isChatInputCommand?.();
        const user = isInteraction ? context.user : context.author;

        let city = isInteraction ? context.options.getString('city') : args.join(' ');
        let lat = isInteraction ? context.options.getNumber('lat') : null;
        let long = isInteraction ? context.options.getNumber('long') : null;

        // If no city and no lat/long provided via message command
        if (!city && (lat === null || long === null)) {
            const queryReq = await t('common.query_required', {}, guildId);
            return context.reply(queryReq);
        }

        let loadingMsg;
        if (isInteraction) {
            await context.deferReply();
        } else {
            loadingMsg = await context.reply(await t('commands.weather.loading', {}, guildId));
        }

        const editResponse = async (options) => {
            if (isInteraction) return await context.editReply(options);
            if (loadingMsg) return await loadingMsg.edit(options);
            return await context.reply(options);
        };

        try {
            let endpoint = '/weather';
            if (city) {
                endpoint += `?city=${encodeURIComponent(city)}`;
            } else if (lat !== null && long !== null) {
                endpoint += `?lat=${lat}&lon=${long}`;
            }

            const data = await APIClient.get(endpoint);

            if (data.detail) {
                return await editResponse({ content: data.detail });
            }

            const getEmoji = (condition) => {
                const cond = condition.toLowerCase();
                if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
                if (cond.includes('cloud') || cond.includes('overcast')) return '☁️';
                if (cond.includes('rain') || cond.includes('drizzle')) return '🌧️';
                if (cond.includes('snow') || cond.includes('ice')) return '❄️';
                if (cond.includes('thunder')) return '⛈️';
                if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze'))
                    return '🌫️';
                return '🌡️';
            };

            const createCurrentEmbed = async () => {
                return new OpenZeroEmbed({}, context)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTitle(
                        await t(
                            'commands.weather.current_title',
                            { location: `${data.location.name}, ${data.location.country}` },
                            guildId
                        )
                    )
                    .addFields(
                        {
                            name: await t('commands.weather.temp_label', {}, guildId),
                            value: `${data.current.temperature}°C`,
                            inline: true,
                        },
                        {
                            name: await t('commands.weather.condition_label', {}, guildId),
                            value: `${getEmoji(data.current.condition)} ${data.current.condition}`,
                            inline: true,
                        },
                        {
                            name: await t('commands.weather.humidity', {}, guildId),
                            value: `${data.current.humidity}%`,
                            inline: true,
                        },
                        {
                            name: await t('commands.weather.wind', {}, guildId),
                            value: `${data.current.wind_speed} km/h`,
                            inline: true,
                        }
                    )
                    .setFooter({ text: await t('commands.weather.footer', {}, guildId) });
            };

            const createDailyEmbed = async () => {
                const title = await t('commands.weather.daily_forecast', {}, guildId);
                const maxLabel = await t('commands.weather.max_label', {}, guildId);
                const minLabel = await t('commands.weather.min_label', {}, guildId);

                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(`${title} - ${data.location.name}`)
                    .setFooter({ text: await t('commands.weather.footer', {}, guildId) });

                data.daily.forEach((day) => {
                    embed.addFields({
                        name: day.date,
                        value: `${getEmoji(day.condition)} ${day.condition}\n${maxLabel}: ${day.max_temp}°C | ${minLabel}: ${day.min_temp}°C`,
                        inline: true,
                    });
                });
                return embed;
            };

            const createHourlyEmbed = async () => {
                const title = await t('commands.weather.hourly_forecast', {}, guildId);
                const embed = new OpenZeroEmbed({}, context)
                    .setTitle(`${title} - ${data.location.name}`)
                    .setFooter({ text: await t('commands.weather.footer', {}, guildId) });

                data.hourly.slice(0, 9).forEach((hour) => {
                    const time = hour.time.includes('T') ? hour.time.split('T')[1] : hour.time;
                    embed.addFields({
                        name: time,
                        value: `${getEmoji(hour.condition)} ${hour.temperature}°C`,
                        inline: true,
                    });
                });
                return embed;
            };

            const createButtons = async (active) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('current')
                        .setLabel(await t('commands.weather.current_btn', {}, guildId))
                        .setStyle(active === 'current' ? ButtonStyle.Success : ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('daily')
                        .setLabel(await t('commands.weather.daily_btn', {}, guildId))
                        .setStyle(active === 'daily' ? ButtonStyle.Success : ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('hourly')
                        .setLabel(await t('commands.weather.hourly_btn', {}, guildId))
                        .setStyle(active === 'hourly' ? ButtonStyle.Success : ButtonStyle.Primary)
                );
            };

            const responseMsg = await editResponse({
                embeds: [await createCurrentEmbed()],
                components: [await createButtons('current')],
            });

            const collector = responseMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== user.id) {
                    return interaction.reply({
                        content: await t('common.access_denied', {}, guildId),
                        ephemeral: true,
                    });
                }

                let embed;
                if (interaction.customId === 'current') embed = await createCurrentEmbed();
                else if (interaction.customId === 'daily') embed = await createDailyEmbed();
                else if (interaction.customId === 'hourly') embed = await createHourlyEmbed();

                await interaction.update({
                    embeds: [embed],
                    components: [await createButtons(interaction.customId)],
                });
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('curr_dis')
                        .setLabel(await t('commands.weather.current_btn', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('daily_dis')
                        .setLabel(await t('commands.weather.daily_btn', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('hourly_dis')
                        .setLabel(await t('commands.weather.hourly_btn', {}, guildId))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                await editResponse({ components: [disabledRow] }).catch(() => {});
            });
        } catch (error) {
            Logger.error('Weather Error:', error.message);
            const errorText = await t(
                'commands.weather.api_error',
                { error: error.message },
                guildId
            );
            await editResponse({ content: errorText });
        }
    },
};
