const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// ⚙️ AYARLAR
const YETKILI_ROL_ID = 'YETKILI_ROL_ID_BURAYA'; // Yetkili rol ID'si

client.once('ready', () => {
    console.log(`🤖 Bot aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // /ticket-kur komutu (Sadece Sunucu Sahibi)
    if (message.content === '/ticket-kur') {
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('❌ Bu komutu sadece **Sunucu Sahibi** kullanabilir!');
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 [Lig Adı] Destek & Başvuru Merkezi')
            .setDescription('Lütfen işlem yapmak istediğiniz konuyu aşağıdaki butonlardan seçiniz.')
            .setColor('#2b2d31')
            .setFooter({ text: 'Roblox Touch Football Ligi' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_takim')
                .setLabel('Takım Kayıt')
                .setEmoji('⚽')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_sikayet')
                .setLabel('Şikayet')
                .setEmoji('🚨')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_partner')
                .setLabel('Partner')
                .setEmoji('🤝')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_event')
                .setLabel('Çekiliş / Event')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    }

    // Ticket Kapatma
    if (message.content === '!kapat') {
        if (!message.channel.name.includes('-')) {
            return message.reply('❌ Bu komut sadece ticket kanallarında çalışır.');
        }

        await message.channel.send('🔒 Kanal 5 saniye içinde siliniyor...');
        setTimeout(() => {
            message.channel.delete().catch(() => {});
        }, 5000);
    }
});

// BUTON TIKLAMALARI (HATASIZ TICKET AÇMA)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // 1. ANINDA YANIT VER (Uygulama Yanıt Vermedi Hatasını Engeller)
    await interaction.deferReply({ ephemeral: true });

    const { guild, member, customId } = interaction;

    let ticketTuru = '';
    if (customId === 'ticket_takim') ticketTuru = 'takim-kayit';
    else if (customId === 'ticket_sikayet') ticketTuru = 'sikayet';
    else if (customId === 'ticket_partner') ticketTuru = 'partner';
    else if (customId === 'ticket_event') ticketTuru = 'event';
    else return;

    const channelName = `${ticketTuru}-${member.user.username.toLowerCase()}`;

    // Açık ticket kontrolü
    const existingChannel = guild.channels.cache.find(c => c.name === channelName);
    if (existingChannel) {
        return interaction.editReply({ 
            content: `❌ Zaten açık bir **${ticketTuru}** talebiniz var: ${existingChannel}`
        });
    }

    try {
        // Gizli Ticket Kanalı Oluşturma
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone görmesini engelle
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id, // Açan kişi görsün
                    allow: [
                        PermissionFlagsBits.ViewChannel, 
                        PermissionFlagsBits.SendMessages, 
                        PermissionFlagsBits.AttachFiles
                    ],
                },
                {
                    id: YETKILI_ROL_ID, // Yetkili görsün
                    allow: [
                        PermissionFlagsBits.ViewChannel, 
                        PermissionFlagsBits.SendMessages, 
                        PermissionFlagsBits.AttachFiles
                    ],
                }
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎫 ${ticketTuru.toUpperCase()} Talebi`)
            .setDescription(`Hoş geldiniz <@${member.id}>!\n\nYetkililerimiz en kısa sürede sizinle ilgilenecektir.\nTalebi sonlandırmak için **!kapat** yazabilirsiniz.`)
            .setColor('#5865F2');

        await channel.send({ content: `<@${member.id}> | <@&${YETKILI_ROL_ID}>`, embeds: [embed] });
        
        // 2. İşlem tamamlandığında kullanıcıya bildir
        await interaction.editReply({ content: `✅ Ticket kanalınız açıldı: ${channel}` });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Kanal oluşturulurken bir hata oluştu. Botun yetkilerini kontrol edin!' });
    }
});

client.login(process.env.TOKEN);
    
