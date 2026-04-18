import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    name: 'full',
    description: 'Pusat kendali moderasi lengkap (Kick, Ban, Clear, Info)',
    async execute(message, args) {
        // Cek izin moderasi (Manage Messages sebagai standar minimum)
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply(
                'Anda tidak memiliki izin untuk menggunakan perintah moderasi ini.'
            );
        }

        if (!args.length) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Panduan Perintah !full')
                .setDescription('Gunakan perintah ini untuk moderasi cepat.')
                .addFields(
                    { name: '!full info @user', value: 'Menampilkan informasi lengkap pengguna.' },
                    {
                        name: '!full clear <jumlah>',
                        value: 'Menghapus pesan dalam jumlah tertentu.',
                    },
                    {
                        name: '!full kick @user [alasan]',
                        value: 'Mengeluarkan anggota dari server.',
                    },
                    { name: '!full ban @user [alasan]', value: 'Memblokir anggota dari server.' }
                )
                .setTimestamp();
            return message.reply({ embeds: [helpEmbed] });
        }

        const subCommand = args[0].toLowerCase();
        const targetArgs = args.slice(1);

        try {
            switch (subCommand) {
                case 'info':
                    return await handleInfo(message);
                case 'clear':
                    return await handleClear(message, targetArgs);
                case 'kick':
                    return await handleKick(message, targetArgs);
                case 'ban':
                    return await handleBan(message, targetArgs);
                default:
                    return message.reply(
                        'Sub-perintah tidak dikenal. Gunakan `!full` untuk bantuan.'
                    );
            }
        } catch (error) {
            Logger.error(`Error in !full ${subCommand}:`, error);
            message.reply(`Terjadi kesalahan: ${error.message}`);
        }
    },
};

async function handleInfo(message) {
    const target = message.mentions.members.first() || message.member;
    const roles =
        target.roles.cache
            .filter((role) => role.name !== '@everyone')
            .map((role) => role.toString())
            .join(', ') || 'Tidak ada';

    const embed = new EmbedBuilder()
        .setColor('#20f0f2')
        .setTitle(`Informasi Pengguna: ${target.user.tag}`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'ID Pengguna', value: target.id, inline: true },
            { name: 'Nickname', value: target.displayName, inline: true },
            {
                name: 'Akun Dibuat',
                value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`,
                inline: true,
            },
            {
                name: 'Bergabung Server',
                value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
                inline: true,
            },
            { name: `Roles [${target.roles.cache.size - 1}]`, value: roles }
        )
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function handleClear(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply('Anda butuh izin `Manage Messages` untuk menghapus pesan.');
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
        return message.reply('Masukkan jumlah pesan antara 1 hingga 100.');
    }

    await message.channel.bulkDelete(amount + 1, true);
    const msg = await message.channel.send(`✅ Berhasil menghapus ${amount} pesan.`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
}

async function handleKick(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply('Anda tidak memiliki izin `Kick Members`.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('Sebutkan (@mention) anggota yang ingin di-kick.');
    if (!target.kickable) return message.reply('Saya tidak bisa menge-kick anggota ini.');

    const reason = args.slice(1).join(' ') || 'Tidak ada alasan diberikan.';
    await target.kick(reason);

    return message.reply(`👢 **${target.user.tag}** telah dikeluarkan. Alasan: ${reason}`);
}

async function handleBan(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply('Anda tidak memiliki izin `Ban Members`.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('Sebutkan (@mention) anggota yang ingin di-ban.');
    if (!target.bannable) return message.reply('Saya tidak bisa memblokir anggota ini.');

    const reason = args.slice(1).join(' ') || 'Tidak ada alasan diberikan.';
    await target.ban({ reason });

    return message.reply(`🔨 **${target.user.tag}** telah diblokir permanen. Alasan: ${reason}`);
}
