const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot aktif olduğunda slash komutlarını kaydedelim
client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('ticketbaslat')
            .setDescription('Ticket (Destek) panelini seçilen kanala gönderir.')
            .addChannelOption(option =>
                option.setName('kanal')
                    .setDescription('Panelin gönderileceği kanal')
                    .setRequired(true)
            )
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Ticket komutu yüklendi.');
    } catch (error) {
        console.error(error);
    }
});

// Komut Çalıştırıldığında
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ticketbaslat') {
            // Sunucu sahibi kontrolü
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'Bu komutu yalnızca sunucu sahibi kullanabilir!', ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('kanal');

            const embed = new EmbedBuilder()
                .setTitle('🎫 Destek ve Başvuru Sistemi')
                .setDescription('İşlem yapmak istediğiniz kategoriye ait butona tıklayarak özel bilet (ticket) oluşturabilirsiniz.')
                .setColor('#2b2d31')
                .setFooter({ text: 'TTL | League Management' });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_yetkili')
                    .setLabel('Yetkili Alım')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('ticket_event')
                    .setLabel('Event / Çekiliş')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎉')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_partner')
                    .setLabel('Partner')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🤝'),
                new ButtonBuilder()
                    .setCustomId('ticket_reklam')
                    .setLabel('Reklam')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('📢')
            );

            await targetChannel.send({ embeds: [embed], components: [row1, row2] });
            await interaction.reply({ content: `Ticket paneli başarıyla ${targetChannel} kanalına gönderildi!`, ephemeral: true });
        }
    }

    // Buton Etkileşimleri
    if (interaction.isButton()) {
        const categories = {
            'ticket_yetkili': { name: 'yetkili-alim', title: 'Yetkili Alım Talebi' },
            'ticket_event': { name: 'event-cekilis', title: 'Event / Çekiliş Talebi' },
            'ticket_partner': { name: 'partner', title: 'Partnerlik Başvurusu' },
            'ticket_reklam': { name: 'reklam', title: 'Reklam İşlemleri' }
        };

        // Ticket Kapatma Butonu
        if (interaction.customId === 'ticket_close') {
            await interaction.reply({ content: 'Ticket kapatılıyor, kanal birazdan silinecek...', ephemeral: true });
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error('Kanal silinemedi:', err);
                }
            }, 3000);
            return;
        }

        const ticketData = categories[interaction.customId];
        if (!ticketData) return;

        await interaction.reply({ content: 'Biletiniz oluşturuluyor, lütfen bekleyin...', ephemeral: true });

        try {
            // Belirttiğin ID'li kategori altına özel kanal oluşturma
            const channel = await interaction.guild.channels.create({
                name: `${ticketData.name}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: '1555895488975474809', // Belirttiğin Kategori ID'si
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        denied: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(ticketData.title)
                .setDescription(`Merhaba ${interaction.user}, yetkililer kısa süre içinde sizinle ilgilenecektir.\nTalebinizi kapatmak için aşağıdaki **Kapat Ticket** butonunu kullanabilirsiniz.`)
                .setColor('#00FF00');

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Kapat Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await channel.send({ content: `${interaction.user}`, embeds: [welcomeEmbed], components: [closeRow] });

        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: 'Kanal oluşturulurken bir hata oluştu! Kategori ID\'sini doğru girdiğinden emin ol.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
