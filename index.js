const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Railway'in botu uyutmaması için web sunucusu
const app = express();
app.get('/', (req, res) => res.send('Bot aktif!'));
app.listen(process.env.PORT || 3000);

// Discord bot ayarları
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.on('ready', () => {
  console.log(`${client.user.tag} başarıyla giriş yaptı!`);
});

// Mesajlara cevap verme örneği
client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

client.login(MTUwOTg0ODMyMDU1NjkyNDk0OA.G-OeGi.ZD9bDq-0ylvKX6h4S37feuKinIsYpUqZjNKxNA);
