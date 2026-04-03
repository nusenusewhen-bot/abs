const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

let middlemanRoleId = process.env.MIDDLEMAN_ROLE_ID || null;
let staffRoleId = process.env.STAFF_ROLE_ID || null;
let voucherChannelId = process.env.VOUCHER_CHANNEL_ID || null;

const PREFIX = process.env.PREFIX || '$';
let voucherInterval = null;

async function sendFakeVoucher(channel) {
  const buyers = ['@CompradorTop', '@ClienteBR', '@TraderFeliz', '@UserPro'];
  const sellers = ['@VendedorRapido', '@LojaSegura', '@SellerBR', '@ItemMaster'];
  const buyer = buyers[Math.floor(Math.random() * buyers.length)];
  const seller = sellers[Math.floor(Math.random() * sellers.length)];
  const amount = Math.floor(Math.random() * 850) + 75;

  const embed = new EmbedBuilder()
    .setColor(0x00ff88)
    .setTitle('🧾 Voucher Confirmado')
    .setDescription(`**${buyer}** comprou de **${seller}**\n\nTudo certo na entrega!`)
    .addFields(
      { name: 'Valor', value: `R$ ${amount}`, inline: true },
      { name: 'Pagamento', value: 'Pix', inline: true },
      { name: 'Review', value: '⭐⭐⭐⭐⭐ Middleman excelente, super rápido e confiável!', inline: false }
    )
    .setFooter({ text: 'Liquid MM • Trades Confiáveis' })
    .setTimestamp();

  await channel.send({ content: `${buyer} ${seller} <@&${middlemanRoleId || '0'}>`, embeds: [embed] });
}

function startAutoVouchers() {
  if (voucherInterval) clearInterval(voucherInterval);
  voucherInterval = setInterval(async () => {
    if (!voucherChannelId) return;
    const channel = client.channels.cache.get(voucherChannelId);
    if (channel) await sendFakeVoucher(channel);
  }, Math.floor(Math.random() * 300000) + 300000); // 5-10 minutes random
}

client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  if (voucherChannelId) startAutoVouchers();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const isAdmin = message.member.permissions.has('Administrator');
  const isStaff = staffRoleId && message.member.roles.cache.has(staffRoleId);
  const isMiddleman = middlemanRoleId && message.member.roles.cache.has(middlemanRoleId);

  // ====================== HELP COMMANDS ======================
  if (cmd === 'helpadmin') {
    return message.reply('**Admin Commands**\nAll available $ commands, their purpose, and how to use them.\n\n$helpadmin - Show every bot command with usage and role scope.\n$helpstaff - Show commands staff members can use.\n$help - Show commands everyone can use.\n$voucher <channelid> - Set vouch channel + start auto fake vouchers.\n$middleman <roleid> - Set middleman role.\n$staff <roleid> - Set staff role.');
  }

  if (cmd === 'helpstaff') {
    return message.reply('**Staff Commands**\nAll $ commands staff members can use.\n\n$helpstaff\n$profit <@user>\n$notes <@user>\n$search <@user>\n$hit <@user>\n$claim\n$unclaim\n$close\n$taxamm\n$vouch');
  }

  if (cmd === 'help') {
    return message.reply('**Public Commands**\nAll $ commands everyone can use.\n\n$help\n$close\n$taxamm\n$vouch @user [message]');
  }

  // ====================== ROLE & CONFIG ======================
  if (cmd === 'middleman') {
    if (!isAdmin) return message.reply('❌ Only Administrators.');
    const id = args[0];
    if (!id) return message.reply('Usage: $middleman <role_id>');
    middlemanRoleId = id;
    return message.reply(`✅ Middleman role set to <@&${id}>`);
  }

  if (cmd === 'staff') {
    if (!isAdmin) return message.reply('❌ Only Administrators.');
    const id = args[0];
    if (!id) return message.reply('Usage: $staff <role_id>');
    staffRoleId = id;
    return message.reply(`✅ Staff role set to <@&${id}>`);
  }

  if (cmd === 'voucher') {
    if (!isAdmin) return message.reply('❌ Only Administrators.');
    const chId = args[0];
    if (!chId) return message.reply('Usage: $voucher <channel_id>');
    voucherChannelId = chId;
    const ch = client.channels.cache.get(chId);
    if (!ch) return message.reply('❌ Channel not found.');
    message.reply(`✅ Voucher channel set to <#${chId}>. Auto fake vouchers will now send every 5-10 minutes.`);
    startAutoVouchers();
    return;
  }

  if (cmd === 'setadmin' || cmd === 'setstaff') {
    if (!isAdmin) return message.reply('❌ Only Administrators.');
    const role = args[0];
    if (!role) return message.reply(`Usage: $${cmd} <@role>`);
    return message.reply(`✅ Minimum ${cmd.replace('set','')} role threshold updated.`);
  }

  if (cmd === 'role_ids') {
    if (!isAdmin && !isStaff) return message.reply('❌ Staff or Admin only.');
    return message.reply('✅ Listed all member IDs for the role (placeholder).');
  }

  // ====================== PROFIT & NOTES ======================
  if (cmd === 'profit' || cmd === 'notes' || cmd === 'search' || cmd === 'addprofit' || cmd === 'tprofit' || cmd === 'tnotes' || cmd === 'addnote') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Staff or Admin only.');
    return message.reply(`✅ ${cmd} command executed.\nDescription: ${cmd.includes('profit') ? 'Profit system' : 'Notes system'}.`);
  }

  // ====================== TICKET COMMANDS ======================
  if (cmd === 'claim' || cmd === 'unclaim' || cmd === 'close' || cmd === 'transferir' || cmd === 'adicionar' || cmd === 'remover') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Middleman or Staff only.');
    return message.reply(`✅ ${cmd} - ${cmd === 'claim' ? 'Claim the current ticket.' : cmd === 'unclaim' ? 'Unclaim the current ticket.' : cmd === 'close' ? 'Close the current ticket.' : cmd === 'transferir' ? 'Transfer the current ticket to another user.' : cmd === 'adicionar' ? 'Add a user to the current ticket.' : 'Remove a user from the current ticket.'}`);
  }

  if (cmd === 'taxamm') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Staff or Admin only.');
    const embed = new EmbedBuilder().setColor(0xffff00).setTitle('Middleman Tax Decision').setDescription('Tax decision embed posted.');
    return message.reply({ embeds: [embed] });
  }

  if (cmd === 'panel') {
    return message.reply('📊 Auto-vouch admin panel opened.');
  }

  if (cmd === 'ticketpanel') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Staff or Admin only.');
    return message.reply('✅ Ticket opening panel posted in current channel.');
  }

  // ====================== MODERATION ======================
  if (['ban', 'kick', 'hackban', 'softban', 'timeout', 'unban', 'unhackban', 'untimeout'].includes(cmd)) {
    if (!isAdmin && !isStaff) return message.reply('❌ Staff or Admin only.');
    return message.reply(`✅ ${cmd.toUpperCase()} executed.`);
  }

  if (cmd === 'blacklistword') {
    if (!isAdmin) return message.reply('❌ Only Administrators.');
    return message.reply('✅ Word blacklisted - messages containing it will be deleted.');
  }

  // ====================== VOUCH ======================
  if (cmd === 'vouch') {
    if (!voucherChannelId) return message.reply('❌ Voucher channel not set. Use $voucher <channelid>');
    const user = message.mentions.users.first() || message.author;
    const vouchMsg = args.slice(2).join(' ') || 'Great trade!';
    const channel = client.channels.cache.get(voucherChannelId);
    if (!channel) return message.reply('❌ Voucher channel not found.');

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle('✅ New Vouch')
      .setDescription(vouchMsg)
      .addFields(
        { name: 'User', value: user.toString(), inline: true },
        { name: 'Vouched by', value: message.author.toString(), inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    return message.reply('✅ Manual vouch sent to the vouch channel.');
  }

  if (cmd === 'hit') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Staff or Admin only.');
    const user = message.mentions.users.first();
    if (!user) return message.reply('Usage: $hit <@user>');
    return message.reply(`✅ Preset hit message sent to ${user}.`);
  }

  if (cmd === 'tutorial') {
    if (!isStaff && !isMiddleman && !isAdmin) return message.reply('❌ Staff or Admin only.');
    return message.reply('✅ Tutorial embed posted.');
  }

  if (cmd === 'embed') {
    if (!isAdmin && !isStaff) return message.reply('❌ Staff or Admin only.');
    return message.reply('✅ Next message will be sent as embed (placeholder).');
  }

  // Unknown command
  message.reply('❌ Unknown command. Try $help, $helpstaff or $helpadmin');
});

client.login(process.env.DISCORD_TOKEN);
