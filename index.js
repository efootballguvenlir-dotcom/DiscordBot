const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Veri Saklama (JSON Veritabanı)
const DATA_FILE = './database.json';
let db = { players: {}, match: null };

if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function getPlayerData(userId) {
  if (!db.players[userId]) {
    db.players[userId] = { goals: 0, assists: 0, saves: 0, country: 'Not set', timezone: 'UTC' };
  }
  return db.players[userId];
}

function calculateLevel(stats) {
  const totalPoints = stats.goals + stats.assists + stats.saves;
  const level = Math.floor(totalPoints / 20);
  return level > 99 ? 99 : level;
}

// Rol ID'leri
const OWNER_ROLE = '1563581540166795445';
const CAPTAIN_ROLE = '1563581659364986982';

client.once('ready', () => {
  console.log(`Bot active as ${client.user.tag}!`);
});

// Komut İşleyici
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const isOwner = message.member.roles.cache.has(OWNER_ROLE);
  const isCaptain = message.member.roles.cache.has(CAPTAIN_ROLE) || isOwner;

  // --- HELP / YARDIM COMMANDS ---
  if (command === '.yardim' || command === '.help') {
    const embed = new EmbedBuilder()
      .setTitle('📖 ARSENAL BOT COMMAND LIST')
      .setColor('#FF0000')
      .setDescription('Here is the list of all available commands categorized by roles:')
      .addFields(
        {
          name: '👥 Squad Player Commands',
          value: '`.profil [@user]` - Show stats, level, country & timezone.\n`.setcountry <country>` - Set your country.\n`.settimezone <timezone>` - Set your timezone.\n`.match` - View match countdown.'
        },
        {
          name: '⭐ Captain Commands',
          value: '`.line5 @GK @DEF @MF @FW @SUB` - Create a 5-man match lineup.'
        },
        {
          name: '👑 Owner Commands',
          value: '`/matcholustur` - Schedule match & set countdown.\n`.gol-ekle @user [amount]` - Add goal(s).\n`.gol-sil @user [amount]` - Remove goal(s).\n`.assist-ekle @user [amount]` - Add assist(s).\n`.assist-cikar @user [amount]` - Remove assist(s).\n`.save-ekle @user [amount]` - Add save(s).\n`.save-cikar @user [amount]` - Remove save(s).'
        }
      )
      .setFooter({ text: 'Arsenal FC • TPS Street • TPL League' });

    return message.channel.send({ embeds: [embed] });
  }

  // --- OWNER COMMANDS ---
  if (command === '.gol-ekle') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player: `.gol-ekle @player 1`');
    
    const p = getPlayerData(target.id);
    p.goals += amount;
    saveDB();
    return message.channel.send(`⚽ Added **${amount} Goal(s)** to ${target}!`);
  }

  if (command === '.gol-sil') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player.');
    
    const p = getPlayerData(target.id);
    p.goals = Math.max(0, p.goals - amount);
    saveDB();
    return message.channel.send(`⚽ Removed **${amount} Goal(s)** from ${target}.`);
  }

  if (command === '.assist-ekle') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player.');
    
    const p = getPlayerData(target.id);
    p.assists += amount;
    saveDB();
    return message.channel.send(`🅰️ Added **${amount} Assist(s)** to ${target}!`);
  }

  if (command === '.assist-cikar') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player.');
    
    const p = getPlayerData(target.id);
    p.assists = Math.max(0, p.assists - amount);
    saveDB();
    return message.channel.send(`🅰️ Removed **${amount} Assist(s)** from ${target}.`);
  }

  if (command === '.save-ekle') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player.');
    
    const p = getPlayerData(target.id);
    p.saves += amount;
    saveDB();
    return message.channel.send(`🧤 Added **${amount} Save(s)** to ${target}!`);
  }

  if (command === '.save-cikar') {
    if (!isOwner) return message.reply('❌ Only the **Owner** can use this command!');
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]) || 1;
    if (!target) return message.reply('Please mention a player.');
    
    const p = getPlayerData(target.id);
    p.saves = Math.max(0, p.saves - amount);
    saveDB();
    return message.channel.send(`🧤 Removed **${amount} Save(s)** from ${target}.`);
  }

  // --- CAPTAIN COMMANDS ---
  if (command === '.line5') {
    if (!isCaptain) return message.reply('❌ Only the **Captain** or **Owner** can use this command!');
    const mentions = message.mentions.users.first(5);
    if (mentions.length < 5) return message.reply('Usage: `.line5 @GK @DEF @MF @FW @SUB` (Select 5 players)');

    const embed = new EmbedBuilder()
      .setTitle('🔴 ARSENAL 5-MAN LINEUP')
      .setColor('#FF0000')
      .setDescription(`**Official Starting Squad:**\n\n🧤 **GK:** ${mentions[0]}\n🛡️ **DEF:** ${mentions[1]}\n⚙️ **MF:** ${mentions[2]}\n🎯 **FW:** ${mentions[3]}\n⚡ **SUB:** ${mentions[4]}`)
      .setFooter({ text: 'TPS Street • TPL League' });

    return message.channel.send({ embeds: [embed] });
  }

  // --- SQUAD PLAYER COMMANDS ---
  if (command === '.profil') {
    const target = message.mentions.users.first() || message.author;
    const p = getPlayerData(target.id);
    const lvl = calculateLevel(p);
    const totalPoints = p.goals + p.assists + p.saves;

    const embed = new EmbedBuilder()
      .setTitle(`👤 PLAYER PROFILE | ${target.username}`)
      .setColor('#FF0000')
      .addFields(
        { name: '🌍 Country / Timezone', value: `Country: **${p.country}**\nTimezone: **${p.timezone}**`, inline: false },
        { name: '🏆 Level Status', value: `Level **${lvl}** / 99 (${totalPoints} Total Points)`, inline: false },
        { name: '⚽ Statistics', value: `Goals: **${p.goals}**\nAssists: **${p.assists}**\nSaves: **${p.saves}**`, inline: true }
      )
      .setFooter({ text: 'Arsenal FC Player Card' });

    return message.channel.send({ embeds: [embed] });
  }

  if (command === '.setcountry') {
    const country = args.join(' ');
    if (!country) return message.reply('Usage: `.setcountry Turkey` or `.setcountry England`');
    const p = getPlayerData(message.author.id);
    p.country = country;
    saveDB();
    return message.reply(`✅ Your country has been set to: **${country}**`);
  }

  if (command === '.settimezone') {
    const tz = args[0];
    if (!tz) return message.reply('Usage: `.settimezone UTC+3` or `.settimezone UTC+1`');
    const p = getPlayerData(message.author.id);
    p.timezone = tz;
    saveDB();
    return message.reply(`✅ Your timezone has been set to: **${tz}**`);
  }

  if (command === '.match') {
    if (!db.match) {
      return message.channel.send('📅 No upcoming match scheduled currently.');
    }

    const matchTime = new Date(db.match.timestamp);
    const now = new Date();
    const diffMs = matchTime - now;

    if (diffMs <= 0) {
      return message.channel.send(`⚽ **MATCH IS LIVE NOW!**\n**Opponent:** ${db.match.opponent}`);
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const embed = new EmbedBuilder()
      .setTitle('⚽ UPCOMING MATCH COUNTDOWN')
      .setColor('#FF0000')
      .addFields(
        { name: '🆚 Opponent', value: db.match.opponent, inline: true },
        { name: '⏳ Time Remaining', value: `**${hours} hours, ${minutes} minutes** left!`, inline: true }
      )
      .setFooter({ text: 'TPS Street • TPL League' });

    return message.channel.send({ embeds: [embed] });
  }
});

// Slash Command Handler (Owner Match Creator)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'matcholustur') {
    if (!interaction.member.roles.cache.has(OWNER_ROLE)) {
      return interaction.reply({ content: '❌ Only the **Owner** can use this command!', ephemeral: true });
    }

    const opponent = interaction.options.getString('rakip');
    const hoursFromNow = interaction.options.getInteger('kac_saat_sonra');

    const matchDate = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    db.match = { opponent: opponent, timestamp: matchDate.toISOString() };
    saveDB();

    const embed = new EmbedBuilder()
      .setTitle('⚽ MATCH SCHEDULED')
      .setColor('#FF0000')
      .setDescription(`**Opponent:** ${opponent}\n**Countdown:** Starts in **${hoursFromNow} hour(s)**!`)
      .setFooter({ text: 'Use .match command to see live countdown' });

    return interaction.reply({ embeds: [embed] });
  }
});

// Slash Command Registration
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('matcholustur')
        .setDescription('Schedule a match with a countdown')
        .addStringOption(opt => opt.setName('rakip').setDescription('Opponent Team Name').setRequired(true))
        .addIntegerOption(opt => opt.setName('kac_saat_sonra').setDescription('How many hours from now?').setRequired(true))
    ];

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();

client.login(process.env.TOKEN);
                                
