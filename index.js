const { Client, GatewayIntentBits, AuditLogEvent, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildAuditLogs
  ]
});

// Bot Tokeni (Environment Variable / Çevre Değişkeni olarak alınacak)
const TOKEN = process.env.DISCORD_TOKEN;

// Otomatik Log Kanalı Bulma / Oluşturma Fonksiyonu
async function getOrCreateLogChannel(guild) {
  let logChannel = guild.channels.cache.find(c => c.name === '🛡️-guard-log' && c.type === ChannelType.GuildText);
  
  if (!logChannel) {
    try {
      logChannel = await guild.channels.create({
        name: '🛡️-guard-log',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel] // Herkese kapalı
          },
          {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] // Bota açık
          }
        ]
      });
      console.log(`[LOG] ${guild.name} sunucusunda otomatik log kanalı oluşturuldu.`);
    } catch (err) {
      console.error(`[HATA] Log kanalı oluşturulamadı: ${err.message}`);
    }
  }
  return logChannel;
}

client.once('ready', () => {
  console.log(`[BAŞARILI] ${client.user.tag} aktif! TPS Street Koruma çalışıyor.`);
  client.user.setActivity('TPS Street | Sunucu Korumada 🛡️');
});

// 1. KANAL SİLME KORUMASI
client.on('channelDelete', async (channel) => {
  const guild = channel.guild;
  const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
  if (!auditLogs) return;

  const entry = auditLogs.entries.first();
  if (!entry) return;

  const { executor } = entry;
  if (executor.id === client.user.id || executor.id === guild.ownerId) return;

  // Yapan kişinin rollerini al
  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (member) {
    await member.roles.set([]).catch(() => {});
  }

  // Otomatik log kanalına yaz
  const logKanal = await getOrCreateLogChannel(guild);
  if (logKanal) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 UYARI: İZİNSİZ KANAL SİLİNDİ!")
      .setColor("Red")
      .setDescription(`**Silinen Kanal:** #${channel.name}\n**Silen Kişi:** <@${executor.id}> (${executor.tag})\n**Yapılan İşlem:** Kişinin tüm yetkileri/rolleri alındı!`)
      .setTimestamp();
    logKanal.send({ embeds: [embed] });
  }
});

// 2. ROL SİLME KORUMASI
client.on('roleDelete', async (role) => {
  const guild = role.guild;
  const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
  if (!auditLogs) return;

  const entry = auditLogs.entries.first();
  if (!entry) return;

  const { executor } = entry;
  if (executor.id === client.user.id || executor.id === guild.ownerId) return;

  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (member) {
    await member.roles.set([]).catch(() => {});
  }

  const logKanal = await getOrCreateLogChannel(guild);
  if (logKanal) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 UYARI: İZİNSİZ ROL SİLİNDİ!")
      .setColor("Red")
      .setDescription(`**Silinen Rol:** @${role.name}\n**Silen Kişi:** <@${executor.id}> (${executor.tag})\n**Yapılan İşlem:** Kişinin tüm yetkileri alındı!`)
      .setTimestamp();
    logKanal.send({ embeds: [embed] });
  }
});

// 3. İZİNSİZ BOT EKLEME KORUMASI
client.on('guildMemberAdd', async (member) => {
  if (!member.user.bot) return;

  const guild = member.guild;
  const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd }).catch(() => null);
  if (!auditLogs) return;

  const entry = auditLogs.entries.first();
  if (!entry) return;

  const { executor } = entry;
  if (executor.id === guild.ownerId) return;

  // Eklenen Botu At
  await member.kick('İzinsiz Bot Ekleme Koruması').catch(() => {});

  // Ekleyenin Yetkilerini Al
  const executorMember = await guild.members.fetch(executor.id).catch(() => null);
  if (executorMember) {
    await executorMember.roles.set([]).catch(() => {});
  }

  const logKanal = await getOrCreateLogChannel(guild);
  if (logKanal) {
    const embed = new EmbedBuilder()
      .setTitle("🚨 UYARI: İZİNSİZ BOT EKLENDİ!")
      .setColor("Red")
      .setDescription(`**Eklenen Bot:** <@${member.id}>\n**Ekleyen Kişi:** <@${executor.id}>\n**Yapılan İşlem:** Bot atıldı ve ekleyen kişinin yetkileri alındı!`)
      .setTimestamp();
    logKanal.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
    
