const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageTyping
  ]
});

// Data storage
const dataFile = './data.json';
let botData = {
  adminRole: null,
  staffRole: null,
  middlemanRole: null,
  voucherChannel: null,
  users: {},
  tickets: {},
  autoVoucherEnabled: false
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
  client.user.setActivity('Liquid MM | $help', { type: 'WATCHING' });
  
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
  if (voucherInterval) clearInterval(voucherInterval);
  
  const sendVoucher = async () => {
    if (!botData.voucherChannel) return;
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) return;
    
    const username = fakeUsernames[Math.floor(Math.random() * fakeUsernames.length)];
    const review = fakeReviews[Math.floor(Math.random() * fakeReviews.length)];
    const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
    const amount = Math.floor(Math.random() * 500) + 10;
    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
    
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
      .setFooter({ text: `Liquid MM â¢ Vouch System`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    // Ping random online members
    const guild = channel.guild;
    const members = await guild.members.fetch();
    const onlineMembers = members.filter(m => m.presence?.status === 'online' && !m.user.bot).random(3);
    const pings = onlineMembers.map(m => `<@${m.id}>`).join(' ');
    
    await channel.send({ 
      content: pings || '@everyone',
      embeds: [embed] 
    });
  };
  
  // Send first voucher immediately
  sendVoucher();
  
  // Set up random interval between 5-10 minutes
  const scheduleNext = () => {
    const delay = Math.floor(Math.random() * 300000) + 300000; // 5-10 minutes in ms
    voucherInterval = setTimeout(() => {
      sendVoucher();
      scheduleNext();
    }, delay);
  };
  
  scheduleNext();
}

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('$')) return;
  
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  // ==================== HELP COMMANDS ====================
  
  // $helpadmin - Admin help
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
          '`$voucher <channelid>` - Set the voucher channel for auto-vouchers.'
        },
        { name: 'Commands 2', value:
          '`$addprofit <@user> <amount>` - Add profit to a user.\n' +
          '`$tprofit <@user> <amount>` - Set a user\'s profit limit.\n' +
          '`$profit <@user>` - Show a user\'s total profit.\n' +
          '`$tnotes <@user> <amount>` - Set a user\'s notes limit.\n' +
          '`$addnote <@user> <amount> [sidenote]` - Add notes to a user with an optional sidenote.\n' +
          '`$notes <@user>` - Show a user\'s note total and note history.\n' +
          '`$search <@user>` - Show profit, limit, history, and note stats for a user.\n' +
          '`$embed <channel_id>` - Send your next message as an embed to a channel.\n' +
          '`$hit <@user>` - Send the preset hit message to a user.\n' +
          '`$tutorial` - Post the tutorial embed.'
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
      .setFooter({ text: 'Liquid MM â¢ Admin Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $helpstaff - Staff help
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
      .setFooter({ text: 'Liquid MM â¢ Staff Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $help - Public help
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
      .setFooter({ text: 'Liquid MM â¢ Help', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== ROLE CONFIGURATION ====================
  
  // $setadmin <@role>
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
      .setFooter({ text: 'Liquid MM â¢ Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $setstaff <@role>
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
      .setFooter({ text: 'Liquid MM â¢ Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $middleman <roleid>
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
      .setFooter({ text: 'Liquid MM â¢ Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $staff <roleid>
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
      .setFooter({ text: 'Liquid MM â¢ Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $voucher <channelid>
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
      .setFooter({ text: 'Liquid MM â¢ Configuration', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    
    // Start auto-voucher
    startAutoVoucher();
  }
  
  // $panel - Auto-voucher admin panel
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
      .setFooter({ text: 'Liquid MM â¢ Admin Panel', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    if (args[0] === 'on') {
      botData.autoVoucherEnabled = true;
      saveData();
      startAutoVoucher();
      embed.setDescription('â Auto-voucher system has been **ENABLED**');
    } else if (args[0] === 'off') {
      botData.autoVoucherEnabled = false;
      saveData();
      if (voucherInterval) clearInterval(voucherInterval);
      embed.setDescription('ð´ Auto-voucher system has been **DISABLED**');
    } else if (args[0] === 'status') {
      embed.setDescription('Current auto-voucher system status');
    }
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== VOUCH COMMANDS ====================
  
  // $vouch <1-5> <@user> <message> (Admin)
  else if (command === 'vouch' && isAdmin(message.member)) {
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
      .setFooter({ text: `Liquid MM â¢ Vouch System`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch sent successfully!')] });
  }
  
  // $vouch <@user> <message> (Public)
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
      .setFooter({ text: `Liquid MM â¢ Vouch System`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch sent successfully!')] });
  }
  
  // ==================== PROFIT & NOTES COMMANDS ====================
  
  // $addprofit <@user> <amount>
  else if (command === 'addprofit') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$addprofit <@user> <amount>`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].profit += amount;
    botData.users[user.id].history.push({ type: 'profit', amount, date: new Date().toISOString() });
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('ð° Profit Added')
      .setDescription(`Added $${amount} profit to ${user.username}`)
      .addFields(
        { name: 'Total Profit', value: `$${botData.users[user.id].profit}`, inline: true }
      )
      .setFooter({ text: 'Liquid MM â¢ Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $tprofit <@user> <amount>
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
      .setFooter({ text: 'Liquid MM â¢ Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $profit <@user>
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
      .setFooter({ text: 'Liquid MM â¢ Profit System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $tnotes <@user> <amount>
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
      .setFooter({ text: 'Liquid MM â¢ Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $addnote <@user> <amount> [sidenote]
  else if (command === 'addnote') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    const sidenote = args.slice(2).join(' ') || 'No sidenote';
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$addnote <@user> <amount> [sidenote]`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].notes += amount;
    botData.users[user.id].history.push({ type: 'note', amount, sidenote, date: new Date().toISOString() });
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('ð Note Added')
      .setDescription(`Added ${amount} notes to ${user.username}`)
      .addFields(
        { name: 'Total Notes', value: `${botData.users[user.id].notes}`, inline: true },
        { name: 'Sidenote', value: sidenote, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $notes <@user>
  else if (command === 'notes') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { notes: 0, history: [] };
    
    const noteHistory = userData.history?.filter(h => h.type === 'note').slice(-5).map(h => 
      `â¢ ${h.amount} notes - ${h.sidenote || 'No note'} (${new Date(h.date).toLocaleDateString()})`
    ).join('\n') || 'No notes history';
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð User Notes')
      .setDescription(`${user.username}'s notes information`)
      .addFields(
        { name: 'Total Notes', value: `${userData.notes || 0}`, inline: true },
        { name: 'Recent History', value: noteHistory, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Notes System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $search <@user>
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
      .setFooter({ text: 'Liquid MM â¢ Search System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $role_ids <@role>
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
      .setFooter({ text: 'Liquid MM â¢ Role System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== MODERATION COMMANDS ====================
  
  // $ban <@user> [reason]
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
      .addFields(
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $kick <@user> [reason]
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
      .addFields(
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $hackban <user_id> [reason]
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
      .addFields(
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $softban <@user> [reason]
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
      .addFields(
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $timeout <@user> <duration> [reason]
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
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $untimeout <@user> [reason]
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
      .addFields(
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $unban <user_id>
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
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $unhackban <user_id>
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
      .setFooter({ text: 'Liquid MM â¢ Moderation', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== UTILITY COMMANDS ====================
  
  // $embed <channel_id>
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
  
  // $hit <@user>
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
      .setFooter({ text: `Liquid MM â¢ Hit System`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ content: `<@${user.id}>`, embeds: [embed] });
  }
  
  // $tutorial
  else if (command === 'tutorial') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('You do not have permission to use this command.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð How to Use Our Middleman Service')
      .setDescription('Welcome to Liquid MM! Here\'s how our middleman service works:')
      .addFields(
        { name: 'ð Step 1', value: 'Create a ticket using the button below or type `$close` to close your ticket.', inline: false },
        { name: 'ð¤ Step 2', value: 'Wait for a middleman to claim your ticket.', inline: false },
        { name: 'ð° Step 3', value: 'Follow the middleman\'s instructions to complete your trade safely.', inline: false },
        { name: 'â Step 4', value: 'Once the trade is complete, leave a vouch using `$vouch @middleman <message>`!', inline: false }
      )
      .setFooter({ text: 'Liquid MM â¢ Tutorial', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $taxamm
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
      .setFooter({ text: 'Liquid MM â¢ Tax System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== TICKET COMMANDS ====================
  
  // $claim
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
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $unclaim
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
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $close
  else if (command === 'close') {
    const ticket = botData.tickets[message.channel.id];
    
    if (!isStaff(message.member) && ticket?.claimedBy !== message.author.id) {
      // Allow users to close their own tickets
      const channelName = message.channel.name;
      if (!channelName.includes(message.author.username.toLowerCase()) && !isStaff(message.member)) {
        return message.reply({ embeds: [createErrorEmbed('You do not have permission to close this ticket.')] });
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð Closing Ticket')
      .setDescription('This ticket will be closed in 5 seconds...')
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    
    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 5000);
  }
  
  // $transferir <@user>
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
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $adicionar <@user>
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
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â User Added')
      .setDescription(`${user.username} has been added to this ticket`)
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // $remover <@user>
  else if (command === 'remover') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Only middlemen can remove users from tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Usage: `$remover <@user>`')] });
    }
    
    await message.channel.permissionOverwrites.delete(user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('â User Removed')
      .setDescription(`${user.username} has been removed from this ticket`)
      .setFooter({ text: 'Liquid MM â¢ Ticket System', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
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
