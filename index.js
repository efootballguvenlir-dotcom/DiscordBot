const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');

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
            .setName('hakemkayitbaslat')
            .setDescription('Hakem başvuru panelini seçilen kanala gönderir.')
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
        console.log('Slash komutları yüklendi.');
    } catch (error) {
        console.error(error);
    }
});

// Komut Çalıştırıldığında
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'hakemkayitbaslat') {
            // Sunucu sahibi kontrolü
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'Bu komutu yalnızca sunucu sahibi kullanabilir!', ephemeral: true });
            }

            const targetChannel = interaction.options.getChannel('kanal');

            const embed = new EmbedBuilder()
                .setTitle('🏆 Hakem Alım Sistemi')
                .setDescription('Ligimizde hakem olmak istiyorsan aşağıdaki **Yetkili Alım** butonuna tıkla!')
                .setColor('#2b2d31');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hakem_basvuru_btn')
                    .setLabel('Yetkili Alım')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );

            // Seçilen kanala paneli gönder
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `Başvuru paneli başarıyla ${targetChannel} kanalına gönderildi!`, ephemeral: true });
        }
    }

    // Butona Tıklandığında
    if (interaction.isButton()) {
        if (interaction.customId === 'hakem_basvuru_btn') {
            await interaction.reply({ content: 'Başvuru talebiniz alındı! Yetkililer sizinle iletişime geçecektir.', ephemeral: true });

            // #hakemyetkili kanalına bildirim gönderme
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'hakemyetkili');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 Yeni Hakem Başvurusu')
                    .setDescription(`**Başvuran:** ${interaction.user} (${interaction.user.tag})\n**ID:** ${interaction.user.id}`)
                    .setColor('#00FF00')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    }
});

client.login(process.env.TOKEN);
