const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Komut dinleyicisi
client.on('messageCreate', async message => {
    if (message.content === '.hakemkayitbaslat') {
        // Sunucu sahibi kontrolü
        if (message.author.id !== message.guild.ownerId) {
            return message.reply('Bu komutu yalnızca sunucu sahibi kullanabilir!');
        }

        const embed = new EmbedBuilder()
            .setTitle('Hakem Alım Sistemi')
            .setDescription('Hakem olmak için aşağıdaki butona tıklayın ve başvurunuzu başlatın!')
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hakem_basvuru_btn')
                .setLabel('Yetkili Alım')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );

        // Komutun yazıldığı kanala paneli gönderir
        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// Butona tıklandığında özel mesaj (DM) gönderme
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'hakem_basvuru_btn') {
        try {
            // Kullanıcıya özel mesaj gönderir
            await interaction.user.send('Hakem başvurunuza hoş geldiniz! Lütfen formu doldurun...');
            await interaction.reply({ content: 'Başvuru formu özel mesaj (DM) yoluyla gönderildi!', ephemeral: true });
            
            // #hakemyetkili kanalına bildirim düşme işlemi
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'hakemyetkili');
            if (logChannel) {
                logChannel.send(`📥 ${interaction.user.tag} adlı kullanıcı hakem başvuru butonuna tıkladı.`);
            }
        } catch (error) {
            await interaction.reply({ content: 'Özel mesajlarınız kapalı olduğu için size ulaşamadık. Lütfen DM kutunuzu açın.', ephemeral: true });
        }
    }
});



        
