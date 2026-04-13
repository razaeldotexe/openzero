# Discord Bot Modular (ESM)

Bot Discord sederhana yang dibangun menggunakan **Discord.js v14** dengan struktur **Modular Command Handler** dan mendukung **ES Modules (ESM)**.

## Fitur
- **Modular Commands**: Perintah dipisahkan ke dalam folder `/commands`.
- **ES Modules**: Menggunakan sintaks `import/export` terbaru.
- **Prefix Command**: Menggunakan prefix `!` untuk menjalankan perintah.
- **Activity Status**: Status bot kustom otomatis saat aktif.

## Prasyarat
- Node.js v16.11.0 ke atas.
- Akun Discord Developer Portal.

## Cara Instalasi

1. **Clone repository ini:**
   ```bash
   git clone <url-repository>
   cd open-0
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Buat file `.env` di root direktori dan masukkan token bot Anda:
   ```env
   DISCORD_TOKEN=your_token_here
   ```

4. **Aktifkan Message Content Intent:**
   Pastikan Anda mengaktifkan **Message Content Intent** di [Discord Developer Portal](https://discord.com/developers/applications) pada bagian **Bot**.

## Cara Menjalankan
```bash
node index.js
```

## Menambahkan Perintah Baru
Cukup buat file `.js` baru di dalam folder `commands/` dengan format:
```javascript
export default {
    name: 'nama-command',
    description: 'Penjelasan command',
    execute(message, args) {
        message.reply('Halo!');
    },
};
```
