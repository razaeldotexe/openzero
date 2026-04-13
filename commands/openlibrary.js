import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} from 'discord.js';

export default {
    name: 'openlibrary',
    description: 'Cari buku di Open Library',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('❌ Mohon berikan judul buku yang ingin dicari. Contoh: `!openlibrary The Lord of the Rings`');
        }

        const query = args.join(' ');
        const loadingMsg = await message.reply('🔍 Sedang mencari buku di Open Library...');

        try {
            const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
            const response = await fetch(searchUrl);

            if (!response.ok) {
                return loadingMsg.edit(`❌ Gagal menghubungi Open Library (Status: ${response.status})`);
            }

            const data = await response.json();

            if (!data.docs || data.docs.length === 0) {
                return loadingMsg.edit(`❌ Tidak ada buku yang ditemukan untuk "${query}".`);
            }

            const books = data.docs;
            let currentIdx = 0;

            const createEmbed = (idx) => {
                const book = books[idx];
                const author = book.author_name ? book.author_name.join(', ') : 'Penulis Tidak Diketahui';
                const firstPublish = book.first_publish_year || 'Tahun Tidak Diketahui';
                const isbn = book.isbn ? book.isbn[0] : null;
                const coverId = book.cover_i;
                const olKey = book.key; // e.g. /works/OL27258W

                const embed = new EmbedBuilder()
                    .setColor('#E57373') // Warna tema buku
                    .setAuthor({ 
                        name: `Diminta oleh ${message.author.username}`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTitle(book.title)
                    .setURL(`https://openlibrary.org${olKey}`)
                    .addFields(
                        { name: '✍️ Penulis', value: author, inline: true },
                        { name: '📅 Terbit Pertama', value: String(firstPublish), inline: true }
                    )
                    .setFooter({ 
                        text: `Hasil ${idx + 1} dari ${books.length} | Open Library API`,
                        iconURL: 'https://openlibrary.org/static/images/openlibrary-logo-tighter.svg'
                    })
                    .setTimestamp();

                if (coverId) {
                    embed.setThumbnail(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
                }

                if (book.subject) {
                    const subjects = book.subject.slice(0, 5).join(', ');
                    embed.addFields({ name: '📚 Subjek', value: subjects });
                }

                return embed;
            };

            const createButtons = (idx) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_book')
                        .setLabel('Sebelumnya')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === 0),
                    new ButtonBuilder()
                        .setCustomId('next_book')
                        .setLabel('Berikutnya')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(idx === books.length - 1)
                );
            };

            const options = { content: null, embeds: [createEmbed(0)] };
            if (books.length > 1) {
                options.components = [createButtons(0)];
            }

            const responseMsg = await loadingMsg.edit(options);

            if (books.length > 1) {
                const collector = responseMsg.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: 120000 
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({ content: 'Akses ditolak.', ephemeral: true });
                    }

                    if (interaction.customId === 'prev_book') currentIdx--;
                    else if (interaction.customId === 'next_book') currentIdx++;

                    await interaction.update({
                        embeds: [createEmbed(currentIdx)],
                        components: [createButtons(currentIdx)]
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('done').setLabel('Pencarian Berakhir').setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );
                    responseMsg.edit({ components: [disabledRow] }).catch(() => {});
                });
            }

        } catch (error) {
            console.error('OpenLibrary Error:', error);
            loadingMsg.edit('❌ Terjadi kesalahan saat mengambil data dari Open Library.');
        }
    },
};
