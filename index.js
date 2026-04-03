const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildPresences
  ]
});

// Data storage
const dataFile = './data.json';
let botData = {
  adminRole: null,
  staffRole: null,
  middlemanRole: null,
  voucherChannel: null,
  supportCategory: null,
  middlemanCategory: null,
  logChannel: null,
  users: {},
  tickets: {},
  autoVoucherEnabled: false,
  ticketCounter: 0
};

// Load data if exists
if (fs.existsSync(dataFile)) {
  botData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// Save data function
function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(botData, null, 2));
}

// Bot ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('MM Bot | $help', { type: 'WATCHING' });
  
  // Start auto-voucher if enabled
  if (botData.autoVoucherEnabled && botData.voucherChannel) {
    startAutoVoucher();
  }
});

// Helper function to check admin permission
function isAdmin(member) {
  if (!botData.adminRole) return member.permissions.has(PermissionsBitField.Flags.Administrator);
  return member.roles.cache.has(botData.adminRole) || member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// Helper function to check staff permission
function isStaff(member) {
  if (isAdmin(member)) return true;
  if (!botData.staffRole) return false;
  return member.roles.cache.has(botData.staffRole);
}

// Helper function to check middleman permission
function isMiddleman(member) {
  if (isStaff(member)) return true;
  if (!botData.middlemanRole) return false;
  return member.roles.cache.has(botData.middlemanRole);
}

// Log function
async function log(guild, title, description, color = '#5865F2') {
  if (!botData.logChannel) return;
  const channel = await guild.channels.fetch(botData.logChannel).catch(() => null);
  if (!channel) return;
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
}

// Auto-voucher data
const fakeUsernames = [
  'CryptoKing', 'TradeMaster', 'PixelTrader', 'GameDealer', 'SwiftExchange',
  'ProTrader', 'EliteSwap', 'FastDeal', 'TrustyMM', 'CoinMaster',
  'DigitalTrader', 'MarketPro', 'ExchangeKing', 'CryptoWhale', 'TradeElite',
  'VouchMaster', 'RepKing', 'DealHunter', 'SwapPro', 'MMExpert'
];

const fakeReviews = [
  'Very trusted middleman! Fast and secure transaction.',
  'Amazing service, will definitely use again!',
  'Super fast and professional. Highly recommended!',
  'Legit MM, helped me with a big trade. Thanks!',
  'Smooth transaction, no issues at all. 10/10!',
  'Trusted seller, fast delivery and great communication.',
  'Best middleman service I\'ve ever used!',
  'Quick and reliable. Thank you for the help!',
  'Very professional and trustworthy. Recommended!',
  'Great experience, trade went perfectly!',
  'Fast response time and secure process.',
  'Legitimate trader, would trade again!',
  'Excellent service, made the trade so easy!',
  'Trustworthy and efficient. 5 stars!',
  'Amazing help with my cross-trade. Thanks!',
  'Very patient and helpful throughout the process.',
  'Secure transaction, felt safe the whole time.',
  'Top tier middleman service!',
  'Flawless trade execution. Thank you!',
  'Best in the business, no cap!'
];

const tradeTypes = [
  'Robux â Gift Cards',
  'Crypto â Robux',
  'Adopt Me Pets â PayPal',
  'MM2 Items â Crypto',
  'Gift Cards â Robux',
  'PayPal â Adopt Me Pets',
  'Bitcoin â Amazon GC',
  'Robux â Steam Cards',
  'Limiteds â PayPal',
  'Game Items â Crypto'
];

let voucherInterval = null;

// Start auto-voucher system
function startAutoVoucher() {
  if (voucherInterval) clearTimeout(voucherInterval);
  
  const sendVoucher = async () => {
    if (!botData.voucherChannel) return;
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) return;
    
    const username = fakeUsernames[Math.floor(Math.random() * fakeUsernames.length)];
    const review = fakeReviews[Math.floor(Math.random() * fakeReviews.length)];
    const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
    const amount = Math.floor(Math.random() * 500) + 10;
    const rating = Math.floor(Math.random() * 2) + 4;
    
    const stars = 'â­'.repeat(rating);
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('â New Vouch Received!')
      .setDescription(`**${username}** left a vouch!`)
      .addFields(
        { name: 'ð Review', value: review, inline: false },
        { name: 'ð° Trade Amount', value: `$${amount}`, inline: true },
        { name: 'ð Trade Type', value: tradeType, inline: true },
        { name: 'â­ Rating', value: stars, inline: true }
      )
      .setFooter({ text: `Vouch System`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    const guild = channel.guild;
    const members = await guild.members.fetch();
    const onlineMembers = members.filter(m => m.presence?.status === 'online' && !m.user.bot).random(3);
    const pings = onlineMembers.map(m => `<@${m.id}>`).join(' ');
    
    await channel.send({ 
      content: pings || '@everyone',
      embeds: [embed] 
    });
  };
  
  sendVoucher();
  
  const scheduleNext = () => {
    const delay = Math.floor(Math.random() * 300000) + 300000;
    voucherInterval = setTimeout(() => {
      sendVoucher();
      scheduleNext();
    }, delay);
  };
  
  scheduleNext();
}

// Ticket transcript function
async function createTranscript(channel, closer) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sortedMessages = Array.from(messages.values()).reverse();
  
  let transcript = `=== TICKET TRANSCRIPT ===\n`;
  transcript += `Channel: ${channel.name}\n`;
  transcript += `Closed by: ${closer.tag}\n`;
  transcript += `Date: ${new Date().toLocaleString()}\n`;
  transcript += `========================\n\n`;
  
  for (const msg of sortedMessages) {
    if (msg.author.bot) continue;
    const time = msg.createdAt.toLocaleString();
    transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
    if (msg.embeds.length > 0) {
      transcript += `  [EMBED: ${msg.embeds[0].title || 'No title'}]\n`;
    }
  }
  
  return transcript;
}

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('$')) return;
  
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  // ==================== HELP COMMANDS ====================
  
  if (command === 'helpadmin') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Admin Commands')
      .setDescription('All available $ commands, their purpose, and how to use them.')
      .addFields(
        { name: 'Commands', value: 
          '`$helpadmin` - Show every bot command with usage and role scope.\n' +
          '`$helpstaff` - Show commands staff members can use.\n' +
          '`$help` - Show commands everyone can use.\n' +
          '`$vouch <1-5> <@user> <message>` - Send a manual vouch embed to the configured vouch channel.\n' +
          '`$panel` - Open the auto-vouch admin panel.\n' +
          '`$role_ids <@role>` - List all member IDs for a role.\n' +
          '`$setadmin <@role>` - Set the minimum admin role threshold.\n' +
          '`$setstaff <@role>` - Set the minimum staff role threshold.\n' +
          '`$middleman <roleid>` - Set the middleman role.\n' +
          '`$staff <roleid>` - Set the staff role.\n' +
          '`$voucher <channelid>` - Set the voucher channel for auto-vouchers.\n' +
          '`$supportcategory <categoryid>` - Set category for support tickets.\n' +
          '`$middlemancategory <categoryid>` - Set category for middleman tickets.\n' +
          '`$logchannel <channelid>` - Set the log channel.'
        },
        { name: 'Commands 2', value:
          '`$ticket support` - Send support ticket panel.\n' +
          '`$ticket middleman` - Send middleman ticket panel.\n' +
          '`$addprofit <@user> <amount>` - Add profit to a user (use negative to remove).\n' +
          '`$tprofit <@user> <amount>` - Set a user\'s profit limit.\n' +
          '`$profit <@user>` - Show a user\'s total profit.\n' +
          '`$tnotes <@user> <amount>` - Set a user\'s notes limit.\n' +
          '`$addnote <@user> <amount> [sidenote]` - Add notes to a user (use negative to remove).\n' +
          '`$notes <@user>` - Show a user\'s note total and note history.\n' +
          '`$search <@user>` - Show profit, limit, history, and note stats for a user.\n' +
          '`$embed <channel_id>` - Send your next message as an embed to a channel.\n' +
          '`$hit <@user>` - Send the preset hit message to a user.\n' +
          '`$tutorial` - Post the tutorial embed.\n' +
          '`$mminfo` - Post the middleman information embed.'
        },
        { name: 'Commands 3', value:
          '`$taxamm` - Post the middleman tax decision embed.\n' +
          '`$ban <@user> [reason]` - Ban a member.\n' +
          '`$kick <@user> [reason]` - Kick a member.\n' +
          '`$hackban <user_id> [reason]` - Ban a user by ID.\n' +
          '`$softban <@user> [reason]` - Softban a member.\n' +
          '`$timeout <@user> <duration> [reason]` - Timeout a member for a duration like 10m or 2h.\n' +
          '`$unban <user_id>` - Unban a user by ID.\n' +
          '`$unhackban <user_id>` - Undo a hackban by user ID.\n' +
          '`$untimeout <@user> [reason]` - Remove a member\'s timeout.'
        }
      )
      .setFooter({ text: 'Admin Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'helpstaff') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Staff Commands')
      .setDescription('All $ commands staff members can use.')
      .addFields(
        { name: 'Commands', value:
          '`$helpstaff` - Show commands staff members can use.\n' +
          '`$help` - Show commands everyone can use.\n' +
          '`$profit <@user>` - Show a user\'s total profit.\n' +
          '`$notes <@user>` - Show a user\'s note total and note history.\n' +
          '`$search <@user>` - Show profit, limit, history, and note stats for a user.\n' +
          '`$hit <@user>` - Send the preset hit message to a user.\n' +
          '`$tutorial` - Post the tutorial embed.'
        },
        { name: 'Commands 2', value:
          '`$claim` - Claim the current ticket.\n' +
          '`$unclaim` - Unclaim the current ticket.\n' +
          '`$close` - Close the current ticket.\n' +
          '`$transferir <@user>` - Transfer the current ticket to another user.\n' +
          '`$adicionar <@user>` - Add a user to the current ticket.\n' +
          '`$remover <@user>` - Remove a user from the current ticket.\n' +
          '`$taxamm` - Post the middleman tax decision embed.\n' +
          '`$timeout <@user> <duration> [reason]` - Timeout a member for a duration like 10m or 2h.\n' +
          '`$untimeout <@user> [reason]` - Remove a member\'s timeout.'
        }
      )
      .setFooter({ text: 'Staff Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Public Commands')
      .setDescription('All $ commands everyone can use.')
      .addFields(
        { name: 'Commands', value:
          '`$help` - Show commands everyone can use.\n' +
          '`$close` - Close your current ticket.\n' +
          '`$taxamm` - Post the middleman tax decision embed.\n' +
          '`$vouch <@user> <message>` - Send a vouch for a user.'
        }
      )
      .setFooter({ text: 'Help', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== TICKET PANELS ====================
  
  else if (command === 'ticket') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const type = args[0]?.toLowerCase();
    
    if (type === 'support') {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Suporte')
        .setDescription('ð¨ â Solicitar suporte!\n\nSomente solicite suporte em casos de:\nDÃºvidas ou perguntas gerais;\nDenÃºncias de scam;\nPedir suporte.');
      
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('support_ticket')
            .setPlaceholder('Selecione o tipo de suporte')
            .addOptions([
              {
                label: 'DÃºvidas ou perguntas gerais',
                value: 'general',
                description: 'General questions and doubts'
              },
              {
                label: 'DenÃºncias de scam',
                value: 'scam',
                description: 'Report a scam'
              },
              {
                label: 'Pedir suporte',
                value: 'support',
                description: 'Request support'
              }
            ])
        );
      
      await message.channel.send({ embeds: [embed], components: [row] });
      await log(message.guild, 'ð« Support Panel', `Support panel created by ${message.author.tag}`, '#57F287');
    }
    
    else if (type === 'middleman') {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Middleman')
        .setDescription('ð¨ â Solicitar MM.\n\nTaxa normais.\n0.99R$ acima de 8R$.\n2.15R$ acima de 100R$.\n4.3R$ acima de 200R$.\n6.8R$ acima de 400R$.\n1.2% acima de 700R$.\nEm contas, Ã© TAXA NORMAL + 2.00R$.\n\nTaxas CrossTrade.\n40c 2 itens\n60c 3+ itens');
      
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('middleman_ticket')
            .setPlaceholder('Selecione o tipo de negociaÃ§Ã£o')
            .addOptions([
              {
                label: 'NegociaÃ§Ãµes atÃ© R$100',
                value: 'mm_100',
                description: 'Trades up to R$100'
              },
              {
                label: 'NegociaÃ§Ãµes atÃ© R$250',
                value: 'mm_250',
                description: 'Trades up to R$250'
              },
              {
                label: 'NegociaÃ§Ãµes atÃ© R$500',
                value: 'mm_500',
                description: 'Trades up to R$500'
              },
              {
                label: 'NegociaÃ§Ãµes atÃ© R$1000',
                value: 'mm_1000',
                description: 'Trades up to R$1000'
              },
              {
                label: 'NegociaÃ§Ãµes a partir de R$1000',
                value: 'mm_1000plus',
                description: 'Trades from R$1000+'
              }
            ])
        );
      
      await message.channel.send({ embeds: [embed], components: [row] });
      await log(message.guild, 'ð« Middleman Panel', `Middleman panel created by ${message.author.tag}`, '#57F287');
    }
    
    else {
      message.reply({ embeds: [createErrorEmbed('Usage: `$ticket support` or `$ticket middleman`')] });
    }
  }
  
  // ==================== CATEGORY CONFIGURATION ====================
  
  else if (command === 'supportcategory') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const categoryId = args[0];
    if (!categoryId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$supportcategory <categoryid>`')] });
    }
    
    const category = message.guild.channels.cache.get(categoryId.replace(/[<#>]/g, ''));
    if (!category || category.type !== ChannelType.GuildCategory) {
      return message.reply({ embeds: [createErrorEmbed('Category not found. Please provide a valid category ID.')] });
    }
    
    botData.supportCategory = category.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Support Category Set')
      .setDescription(`Support tickets will be created in category: **${category.name}**`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'âï¸ Config Updated', `Support category set to ${category.name} by ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'middlemancategory') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const categoryId = args[0];
    if (!categoryId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$middlemancategory <categoryid>`')] });
    }
    
    const category = message.guild.channels.cache.get(categoryId.replace(/[<#>]/g, ''));
    if (!category || category.type !== ChannelType.GuildCategory) {
      return message.reply({ embeds: [createErrorEmbed('Category not found. Please provide a valid category ID.')] });
    }
    
    botData.middlemanCategory = category.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Middleman Category Set')
      .setDescription(`Middleman tickets will be created in category: **${category.name}**`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'âï¸ Config Updated', `Middleman category set to ${category.name} by ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'logchannel') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$logchannel <channelid>`')] });
    }
    
    const channel = message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ''));
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Channel not found.')] });
    }
    
    botData.logChannel = channel.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Log Channel Set')
      .setDescription(`Logs will be sent to: **${channel.name}**`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== MM INFO COMMAND ====================
  
  else if (command === 'mminfo') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('O Middleman tem duas formas de funcionamento.')
      .setDescription(
        '**1Â° forma:**\n' +
        'O Comprador irÃ¡ enviar o Pix para o middleman, apÃ³s isso, o Vendedor irÃ¡ entregar os itens para mim ou para o Comprador diretamente. Quando confirmado a entrega, o Middleman envia o Pix ao Vendedor e entrega os itens ao comprador, caso ele decida entregar ao Middleman primeiramente.\n\n' +
        '**2 forma:**\n' +
        'O Vendedor irÃ¡ entregar os itens ao middleman, apÃ³s isso, o Comprador ira enviar o pix para o Vendedor. Quando confirmado o recebimento do pix, o Middleman e irÃ¡ entregar os itens ao Comprador.'
      )
      .setFooter({ text: 'Middleman Info', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== ROLE CONFIGURATION ====================
  
  else if (command === 'setadmin') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Please mention a role. Usage: `$setadmin <@role>`')] });
    }
    
    botData.adminRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Admin Role Set')
      .setDescription(`Admin role has been set to ${role.name}`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'setstaff') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Please mention a role. Usage: `$setstaff <@role>`')] });
    }
    
    botData.staffRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Staff Role Set')
      .setDescription(`Staff role has been set to ${role.name}`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'middleman') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const roleId = args[0];
    if (!roleId) {
      return message.reply({ embeds: [createErrorEmbed('Please provide a role ID. Usage: `$middleman <roleid>`')] });
    }
    
    const role = message.guild.roles.cache.get(roleId.replace(/[<@&>]/g, ''));
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Role not found. Please provide a valid role ID.')] });
    }
    
    botData.middlemanRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Middleman Role Set')
      .setDescription(`Middleman role has been set to ${role.name}`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'staff') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const roleId = args[0];
    if (!roleId) {
      return message.reply({ embeds: [createErrorEmbed('Please provide a role ID. Usage: `$staff <roleid>`')] });
    }
    
    const role = message.guild.roles.cache.get(roleId.replace(/[<@&>]/g, ''));
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Role not found. Please provide a valid role ID.')] });
    }
    
    botData.staffRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Staff Role Set')
      .setDescription(`Staff role has been set to ${role.name}`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'voucher') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Please provide a channel ID. Usage: `$voucher <channelid>`')] });
    }
    
    const channel = message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ''));
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Channel not found. Please provide a valid channel ID.')] });
    }
    
    botData.voucherChannel = channel.id;
    botData.autoVoucherEnabled = true;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Voucher Channel Set')
      .setDescription(`Voucher channel has been set to ${channel.name}\nAuto-voucher system is now **ENABLED**`)
      .setFooter({ text: 'Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    startAutoVoucher();
  }
  
  else if (command === 'panel') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ðï¸ Auto-Voucher Admin Panel')
      .setDescription('Control the auto-voucher system')
      .addFields(
        { name: 'Status', value: botData.autoVoucherEnabled ? 'ð¢ Enabled' : 'ð´ Disabled', inline: true },
        { name: 'Voucher Channel', value: botData.voucherChannel ? `<#${botData.voucherChannel}>` : 'Not set', inline: true },
        { name: 'Commands', value: 
          '`$panel on` - Enable auto-voucher\n' +
          '`$panel off` - Disable auto-voucher\n' +
          '`$panel status` - Check current status'
        }
      )
      .setFooter({ text: 'Admin Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    if (args[0] === 'on') {
      botData.autoVoucherEnabled = true;
      saveData();
      startAutoVoucher();
      embed.setDescription('â Auto-voucher system has been **ENABLED**');
    } else if (args[0] === 'off') {
      botData.autoVoucherEnabled = false;
      saveData();
      if (voucherInterval) clearTimeout(voucherInterval);
      embed.setDescription('ð´ Auto-voucher system has been **DISABLED**');
    }
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== VOUCH COMMANDS ====================
  
  else if (command === 'vouch' && isAdmin(message.member) && !isNaN(args[0])) {
    const rating = parseInt(args[0]);
    const user = message.mentions.users.first();
    const reviewMessage = args.slice(2).join(' ');
    
    if (!rating || rating < 1 || rating > 5 || !user || !reviewMessage) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$vouch <1-5> <@user> <message>`')] });
    }
    
    if (!botData.voucherChannel) {
      return message.reply({ embeds: [createErrorEmbed('Voucher channel not set. Use `$voucher <channelid>`')] });
    }
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Voucher channel not found.')] });
    }
    
    const stars = 'â­'.repeat(rating);
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('â New Vouch Received!')
      .setDescription(`**${message.author.username}** left a vouch for **${user.username}**!`)
      .addFields(
        { name: 'ð Review', value: reviewMessage, inline: false },
        { name: 'â­ Rating', value: stars, inline: true }
      )
      .setFooter({ text: 'Vouch System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch sent successfully!')] });
  }
  
  else if (command === 'vouch') {
    const user = message.mentions.users.first();
    const reviewMessage = args.slice(1).join(' ');
    
    if (!user || !reviewMessage) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$vouch <@user> <message>`')] });
    }
    
    if (!botData.voucherChannel) {
      return message.reply({ embeds: [createErrorEmbed('Voucher channel not set.')] });
    }
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Voucher channel not found.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('â New Vouch Received!')
      .setDescription(`**${message.author.username}** left a vouch for **${user.username}**!`)
      .addFields(
        { name: 'ð Review', value: reviewMessage, inline: false }
      )
      .setFooter({ text: 'Vouch System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch sent successfully!')] });
  }
  
  // ==================== PROFIT & NOTES COMMANDS ====================
  
  else if (command === 'addprofit') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$addprofit <@user> <amount>` (use negative to remove)')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].profit += amount;
    botData.users[user.id].history.push({ type: 'profit', amount, date: new Date().toISOString() });
    saveData();
    
    const action = amount >= 0 ? 'Added' : 'Removed';
    const embed = new EmbedBuilder()
      .setColor(amount >= 0 ? '#57F287' : '#ED4245')
      .setTitle(`ð° Profit ${action}`)
      .setDescription(`${action} $${Math.abs(amount)} ${amount >= 0 ? 'to' : 'from'} ${user.username}`)
      .addFields(
        { name: 'Total Profit', value: `$${botData.users[user.id].profit}`, inline: true }
      )
      .setFooter({ text: 'Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, `ð° Profit ${action}`, `${action} $${Math.abs(amount)} ${amount >= 0 ? 'to' : 'from'} ${user.tag} by ${message.author.tag}`, amount >= 0 ? '#57F287' : '#ED4245');
  }
  
  else if (command === 'tprofit') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$tprofit <@user> <amount>`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].profit = amount;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° Profit Set')
      .setDescription(`Set ${user.username}'s profit to $${amount}`)
      .setFooter({ text: 'Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð° Profit Set', `Set ${user.tag}'s profit to $${amount} by ${message.author.tag}`);
  }
  
  else if (command === 'profit') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { profit: 0 };
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° User Profit')
      .setDescription(`${user.username}'s profit information`)
      .addFields(
        { name: 'Total Profit', value: `$${userData.profit || 0}`, inline: true }
      )
      .setFooter({ text: 'Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'tnotes') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$tnotes <@user> <amount>`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].notes = amount;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Notes Set')
      .setDescription(`Set ${user.username}'s notes to ${amount}`)
      .setFooter({ text: 'Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Notes Set', `Set ${user.tag}'s notes to ${amount} by ${message.author.tag}`);
  }
  
  else if (command === 'addnote') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    const sidenote = args.slice(2).join(' ') || 'No sidenote';
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$addnote <@user> <amount> [sidenote]` (use negative to remove)')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].notes += amount;
    botData.users[user.id].history.push({ type: 'note', amount, sidenote, date: new Date().toISOString() });
    saveData();
    
    const action = amount >= 0 ? 'Added' : 'Removed';
    const embed = new EmbedBuilder()
      .setColor(amount >= 0 ? '#57F287' : '#ED4245')
      .setTitle(`ð Note ${action}`)
      .setDescription(`${action} ${Math.abs(amount)} notes ${amount >= 0 ? 'to' : 'from'} ${user.username}`)
      .addFields(
        { name: 'Total Notes', value: `${botData.users[user.id].notes}`, inline: true },
        { name: 'Sidenote', value: sidenote, inline: false }
      )
      .setFooter({ text: 'Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, `ð Note ${action}`, `${action} ${Math.abs(amount)} notes ${amount >= 0 ? 'to' : 'from'} ${user.tag} by ${message.author.tag}`, amount >= 0 ? '#57F287' : '#ED4245');
  }
  
  else if (command === 'notes') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { notes: 0, history: [] };
    
    const noteHistory = userData.history?.filter(h => h.type === 'note').slice(-5).map(h => 
      `â¢ ${h.amount > 0 ? '+' : ''}${h.amount} notes - ${h.sidenote || 'No note'} (${new Date(h.date).toLocaleDateString()})`
    ).join('\n') || 'No notes history';
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð User Notes')
      .setDescription(`${user.username}'s notes information`)
      .addFields(
        { name: 'Total Notes', value: `${userData.notes || 0}`, inline: true },
        { name: 'Recent History', value: noteHistory, inline: false }
      )
      .setFooter({ text: 'Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'search') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { profit: 0, notes: 0, history: [] };
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð User Search Results')
      .setDescription(`Information for ${user.username}`)
      .addFields(
        { name: 'ð° Total Profit', value: `$${userData.profit || 0}`, inline: true },
        { name: 'ð Total Notes', value: `${userData.notes || 0}`, inline: true },
        { name: 'ð History Entries', value: `${userData.history?.length || 0}`, inline: true }
      )
      .setFooter({ text: 'Search System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'role_ids') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$role_ids <@role>`')] });
    }
    
    const members = role.members.map(m => `${m.user.username}: ${m.id}`).join('\n') || 'No members with this role';
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð¥ Role Member IDs')
      .setDescription(`Members with role: ${role.name}`)
      .addFields(
        { name: 'Members', value: members.substring(0, 1024) || 'None' }
      )
      .setFooter({ text: 'Role System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== MODERATION COMMANDS ====================
  
  else if (command === 'ban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$ban <@user> [reason]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
    
    await member.ban({ reason });
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð¨ User Banned')
      .setDescription(`${user.username} has been banned`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð¨ User Banned', `${user.tag} was banned by ${message.author.tag}. Reason: ${reason}`, '#ED4245');
  }
  
  else if (command === 'kick') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$kick <@user> [reason]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
    
    await member.kick(reason);
    
    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('ð¢ User Kicked')
      .setDescription(`${user.username} has been kicked`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð¢ User Kicked', `${user.tag} was kicked by ${message.author.tag}. Reason: ${reason}`, '#FEE75C');
  }
  
  else if (command === 'hackban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$hackban <user_id> [reason]`')] });
    }
    
    await message.guild.members.ban(userId, { reason });
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð¨ User Hackbanned')
      .setDescription(`User ID ${userId} has been banned`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð¨ User Hackbanned', `User ID ${userId} was banned by ${message.author.tag}. Reason: ${reason}`, '#ED4245');
  }
  
  else if (command === 'softban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$softban <@user> [reason]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
    
    await member.ban({ reason, days: 1 });
    await message.guild.members.unban(user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð¨ User Softbanned')
      .setDescription(`${user.username} has been softbanned (messages deleted)`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð¨ User Softbanned', `${user.tag} was softbanned by ${message.author.tag}. Reason: ${reason}`, '#ED4245');
  }
  
  else if (command === 'timeout') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const duration = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';
    
    if (!user || !duration) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$timeout <@user> <duration> [reason]`\nExample: `$timeout @user 10m spam`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
    
    const ms = parseDuration(duration);
    if (!ms) {
      return message.reply({ embeds: [createErrorEmbed('Invalid duration. Use format like: 10m, 2h, 1d')] });
    }
    
    await member.timeout(ms, reason);
    
    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('â±ï¸ User Timed Out')
      .setDescription(`${user.username} has been timed out`)
      .addFields(
        { name: 'Duration', value: duration, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â±ï¸ User Timed Out', `${user.tag} was timed out for ${duration} by ${message.author.tag}. Reason: ${reason}`, '#FEE75C');
  }
  
  else if (command === 'untimeout') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$untimeout <@user> [reason]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
    
    await member.timeout(null, reason);
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Timeout Removed')
      .setDescription(`${user.username}'s timeout has been removed`)
      .addFields({ name: 'Reason', value: reason, inline: false })
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â Timeout Removed', `${user.tag}'s timeout was removed by ${message.author.tag}. Reason: ${reason}`, '#57F287');
  }
  
  else if (command === 'unban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const userId = args[0];
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$unban <user_id>`')] });
    }
    
    await message.guild.members.unban(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â User Unbanned')
      .setDescription(`User ID ${userId} has been unbanned`)
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â User Unbanned', `User ID ${userId} was unbanned by ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'unhackban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const userId = args[0];
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$unhackban <user_id>`')] });
    }
    
    await message.guild.members.unban(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Hackban Removed')
      .setDescription(`User ID ${userId} has been unbanned`)
      .setFooter({ text: 'Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â Hackban Removed', `User ID ${userId} was unbanned by ${message.author.tag}`, '#57F287');
  }
  
  // ==================== UTILITY COMMANDS ====================
  
  else if (command === 'embed') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$embed <channel_id>`')] });
    }
    
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, '')).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Channel not found.')] });
    }
    
    const filter = m => m.author.id === message.author.id;
    message.reply('Please send the message you want to embed:');
    
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
    if (!collected.size) {
      return message.reply('Timeout - no message received.');
    }
    
    const embedContent = collected.first().content;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setDescription(embedContent)
      .setFooter({ text: `Sent by ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Embed sent successfully!')] });
  }
  
  else if (command === 'hit') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$hit <@user>`')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð¯ Hit Message')
      .setDescription(`Hey ${user}, you've been hit! Please respond to this message.`)
      .setFooter({ text: 'Hit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ content: `<@${user.id}>`, embeds: [embed] });
  }
  
  else if (command === 'tutorial') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð How to Use Our Middleman Service')
      .setDescription('Welcome! Here\'s how our middleman service works:')
      .addFields(
        { name: 'ð Step 1', value: 'Create a ticket using the menu below or type `$close` to close your ticket.', inline: false },
        { name: 'ð¤ Step 2', value: 'Wait for a middleman to claim your ticket.', inline: false },
        { name: 'ð° Step 3', value: 'Follow the middleman\'s instructions to complete your trade safely.', inline: false },
        { name: 'â Step 4', value: 'Once the trade is complete, leave a vouch using `$vouch @middleman <message>`!', inline: false }
      )
      .setFooter({ text: 'Tutorial', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'taxamm') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° Middleman Tax Decision')
      .setDescription('Please select who will pay the middleman fee:')
      .addFields(
        { name: 'Option 1', value: 'Buyer pays the fee', inline: true },
        { name: 'Option 2', value: 'Seller pays the fee', inline: true },
        { name: 'Option 3', value: 'Split 50/50', inline: true }
      )
      .setFooter({ text: 'Tax System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== TICKET COMMANDS ====================
  
  else if (command === 'claim') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can claim tickets.')] });
    }
    
    if (!botData.tickets[message.channel.id]) {
      botData.tickets[message.channel.id] = {};
    }
    
    botData.tickets[message.channel.id].claimedBy = message.author.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Ticket Claimed')
      .setDescription(`This ticket has been claimed by ${message.author.username}`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â Ticket Claimed', `Ticket ${message.channel.name} claimed by ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'unclaim') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can unclaim tickets.')] });
    }
    
    if (botData.tickets[message.channel.id]?.claimedBy !== message.author.id && !isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You can only unclaim tickets you claimed.')] });
    }
    
    if (botData.tickets[message.channel.id]) {
      delete botData.tickets[message.channel.id].claimedBy;
      saveData();
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('ð Ticket Unclaimed')
      .setDescription(`This ticket is now unclaimed`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Ticket Unclaimed', `Ticket ${message.channel.name} unclaimed by ${message.author.tag}`, '#FEE75C');
  }
  
  else if (command === 'close') {
    const ticket = botData.tickets[message.channel.id];
    
    if (!isStaff(message.member) && ticket?.claimedBy !== message.author.id) {
      const channelName = message.channel.name;
      if (!channelName.includes(message.author.username.toLowerCase()) && !isStaff(message.member)) {
        return message.reply({ embeds: [createErrorEmbed('You do not have permission to close this ticket.')] });
      }
    }
    
    // Create transcript
    const transcript = await createTranscript(message.channel, message.author);
    const transcriptBuffer = Buffer.from(transcript, 'utf-8');
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð Closing Ticket')
      .setDescription('This ticket will be closed in 5 seconds...')
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
    
    // Send transcript to log channel
    if (botData.logChannel) {
      const logCh = await message.guild.channels.fetch(botData.logChannel).catch(() => null);
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('ð Ticket Closed')
          .setDescription(`Ticket: ${message.channel.name}\nClosed by: ${message.author.tag}`)
          .setTimestamp();
        
        await logCh.send({ 
          embeds: [logEmbed], 
          files: [{ attachment: transcriptBuffer, name: `transcript-${message.channel.name}.txt` }] 
        });
      }
    }
    
    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 5000);
  }
  
  else if (command === 'transferir') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can transfer tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$transferir <@user>`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!isMiddleman(member)) {
      return message.reply({ embeds: [createErrorEmbed('Can only transfer to other middlemen.')] });
    }
    
    if (!botData.tickets[message.channel.id]) {
      botData.tickets[message.channel.id] = {};
    }
    
    botData.tickets[message.channel.id].claimedBy = user.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Ticket Transferred')
      .setDescription(`This ticket has been transferred to ${user.username}`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Ticket Transferred', `Ticket ${message.channel.name} transferred to ${user.tag} by ${message.author.tag}`);
  }
  
  else if (command === 'adicionar') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can add users to tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$adicionar <@user>`')] });
    }
    
    await message.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true
    });
    
    if (!botData.tickets[message.channel.id]) botData.tickets[message.channel.id] = { addedUsers: [] };
    if (!botData.tickets[message.channel.id].addedUsers) botData.tickets[message.channel.id].addedUsers = [];
    botData.tickets[message.channel.id].addedUsers.push(user.id);
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â User Added')
      .setDescription(`${user.username} has been added to this ticket`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'remover') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can remove users from tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$remover <@user>`')] });
    }
    
    await message.channel.permissionOverwrites.delete(user.id);
    
    if (botData.tickets[message.channel.id]?.addedUsers) {
      botData.tickets[message.channel.id].addedUsers = botData.tickets[message.channel.id].addedUsers.filter(id => id !== user.id);
      saveData();
    }
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('â User Removed')
      .setDescription(`${user.username} has been removed from this ticket`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== ADD USER COMMAND ====================
  
  else if (command === 'add') {
    if (!args[0]) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$add <user_id>`')] });
    }
    
    const userId = args[0].replace(/[<@!>]/g, '');
    
    try {
      const member = await message.guild.members.fetch(userId);
      
      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true
      });
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('â User Added')
        .setDescription(`${member.user.username} has been added to this ticket`)
        .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      return message.reply({ embeds: [createErrorEmbed('User not found in this server.')] });
    }
  }
});

// Interaction handler for ticket menus
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  
  const { customId, values, user, guild } = interaction;
  const value = values[0];
  
  if (customId === 'support_ticket') {
    if (!botData.supportCategory) {
      return interaction.reply({ embeds: [createErrorEmbed('Support category not set. Contact an admin.')], ephemeral: true });
    }
    
    botData.ticketCounter++;
    saveData();
    
    const ticketNumber = botData.ticketCounter.toString().padStart(4, '0');
    const typeLabels = {
      'general': 'duvidas',
      'scam': 'denuncia',
      'support': 'suporte'
    };
    
    const channel = await guild.channels.create({
      name: `support-${typeLabels[value]}-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: botData.supportCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ]
    });
    
    botData.tickets[channel.id] = {
      type: 'support',
      creator: user.id,
      createdAt: new Date().toISOString()
    };
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð« Support Ticket')
      .setDescription(`Welcome <@${user.id}>! A staff member will assist you shortly.\n\nType: **${typeLabels[value]}**`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    await log(guild, 'ð« Support Ticket Created', `Ticket ${channel.name} created by ${user.tag}`);
  }
  
  else if (customId === 'middleman_ticket') {
    if (!botData.middlemanCategory) {
      return interaction.reply({ embeds: [createErrorEmbed('Middleman category not set. Contact an admin.')], ephemeral: true });
    }
    
    botData.ticketCounter++;
    saveData();
    
    const ticketNumber = botData.ticketCounter.toString().padStart(4, '0');
    const tradeAmounts = {
      'mm_100': 'ate-100',
      'mm_250': 'ate-250',
      'mm_500': 'ate-500',
      'mm_1000': 'ate-1000',
      'mm_1000plus': '1000plus'
    };
    
    const channel = await guild.channels.create({
      name: `mm-${tradeAmounts[value]}-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: botData.middlemanCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ]
    });
    
    botData.tickets[channel.id] = {
      type: 'middleman',
      creator: user.id,
      createdAt: new Date().toISOString()
    };
    saveData();
    
    // Try to detect and add user by ID from message
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð« Middleman Ticket')
      .setDescription(`Welcome <@${user.id}>!\n\nTrade Type: **${tradeAmounts[value]}**\n\nPlease provide the ID of the other party in this trade (if any). Use \`$add <user_id>\` to add them.`)
      .setFooter({ text: 'Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    await log(guild, 'ð« Middleman Ticket Created', `Ticket ${channel.name} created by ${user.tag}`);
  }
});

// Helper functions
function createErrorEmbed(description) {
  return new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('â Error')
    .setDescription(description)
    .setTimestamp();
}

function createSuccessEmbed(description) {
  return new EmbedBuilder()
    .setColor('#57F287')
    .setTitle('â Success')
    .setDescription(description)
    .setTimestamp();
}

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    's': 1000,
    'm': 60000,
    'h': 3600000,
    'd': 86400000
  };
  
  return value * multipliers[unit];
}

// Login
client.login(process.env.DISCORD_TOKEN);
