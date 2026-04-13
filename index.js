import 'dotenv/config';
import { Client, GatewayIntentBits, Events, ActivityType, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Mendapatkan path absolut di modul ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Setup Prefix & Collection Perintah
const PREFIX = '!';
client.commands = new Collection();

// Command Handler (Memuat semua file .js di folder /commands)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = pathToFileURL(path.join(commandsPath, file)).href;
    const { default: command } = await import(filePath);
    
    if (command && command.name) {
        client.commands.set(command.name, command);
        console.log(`✅ Loaded command: ${command.name}`);
    } else {
        console.log(`⚠️ Skip file: ${file} (missing name)`);
    }
}

// Event saat bot aktif
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot berhasil aktif! Login sebagai ${readyClient.user.tag}`);
    
    // Aktivitas bot
    readyClient.user.setActivity('.help | All endpoints have been collected.', { 
        type: ActivityType.Playing 
    });
});

// Event saat ada pesan masuk
client.on(Events.MessageCreate, async (message) => {
    // Jangan respon jika dari bot atau tidak dimulai dengan prefix
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // Parsing command dan argument
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Mencari command di collection
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`Error executing ${commandName}:`, error);
        message.reply('❌ Terjadi kesalahan saat menjalankan perintah tersebut.');
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
