const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
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
  console.log(`Bot logado como ${client.user.tag}!`);
  client.user.setActivity('MM Bot | $help', { type: 'WATCHING' });
  
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
  'Middleman muito confiavel! Transacao rapida e segura.',
  'Servico incrivel, vou usar novamente com certeza!',
  'Super rapido e profissional. Altamente recomendado!',
  'MM legitimo, me ajudou com uma grande troca. Obrigado!',
  'Transacao tranquila, sem problemas. 10/10!',
  'Vendedor confiavel, entrega rapida e otima comunicacao.',
  'Melhor servico de middleman que ja usei!',
  'Rapido e confiavel. Obrigado pela ajuda!',
  'Muito profissional e confiavel. Recomendado!',
  'Otima experiencia, troca perfeita!',
  'Resposta rapida e processo seguro.',
  'Trader legitimo, trocaria novamente!',
  'Excelente servico, facilitou muito a troca!',
  'Confiavel e eficiente. 5 estrelas!',
  'Ajuda incrivel com meu cross-trade. Obrigado!',
  'Muito paciente e prestativo durante todo o processo.',
  'Transacao segura, me senti seguro o tempo todo.',
  'Servico de middleman de primeira!',
  'Execucao de troca impecavel. Obrigado!',
  'O melhor do negocio, sem duvida!'
];

const tradeTypes = [
  'Robux -> Gift Cards',
  'Crypto -> Robux',
  'Adopt Me Pets -> PayPal',
  'MM2 Items -> Crypto',
  'Gift Cards -> Robux',
  'PayPal -> Adopt Me Pets',
  'Bitcoin -> Amazon GC',
  'Robux -> Steam Cards',
  'Limiteds -> PayPal',
  'Game Items -> Crypto'
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
      .setTitle('â Novo Vouch Recebido!')
      .setDescription(`**${username}** deixou um vouch!`)
      .addFields(
        { name: 'ð Avaliacao', value: review, inline: false },
        { name: 'ð° Valor da Troca', value: `$${amount}`, inline: true },
        { name: 'ð Tipo de Troca', value: tradeType, inline: true },
        { name: 'â­ Nota', value: stars, inline: true }
      )
      .setFooter({ text: 'Sistema de Vouches', iconURL: client.user.displayAvatarURL() })
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
  
  let transcript = `=== TRANSCRICAO DO TICKET ===\n`;
  transcript += `Canal: ${channel.name}\n`;
  transcript += `Fechado por: ${closer.tag}\n`;
  transcript += `Data: ${new Date().toLocaleString()}\n`;
  transcript += `========================\n\n`;
  
  for (const msg of sortedMessages) {
    if (msg.author.bot) continue;
    const time = msg.createdAt.toLocaleString();
    transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
    if (msg.embeds.length > 0) {
      transcript += `  [EMBED: ${msg.embeds[0].title || 'Sem titulo'}]\n`;
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
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Comandos de Administrador')
      .setDescription('Todos os comandos $ disponiveis, sua funcao e como usa-los.')
      .addFields(
        { name: 'Comandos', value: 
          '`$helpadmin` - Mostrar todos os comandos de admin\n' +
          '`$helpstaff` - Mostrar comandos para staff\n' +
          '`$help` - Mostrar comandos publicos\n' +
          '`$vouch <1-5> <@user> <mensagem>` - Enviar vouch manual\n' +
          '`$panel` - Painel de controle do auto-vouch\n' +
          '`$role_ids <@role>` - Listar IDs dos membros de um cargo\n' +
          '`$setadmin <@role>` - Definir cargo de admin\n' +
          '`$setstaff <@role>` - Definir cargo de staff\n' +
          '`$middleman <roleid>` - Definir cargo de middleman\n' +
          '`$staff <roleid>` - Definir cargo de staff\n' +
          '`$voucher <channelid>` - Definir canal de vouches\n' +
          '`$supportcategory <categoryid>` - Definir categoria de tickets de suporte\n' +
          '`$middlemancategory <categoryid>` - Definir categoria de tickets de middleman\n' +
          '`$logchannel <channelid>` - Definir canal de logs'
        },
        { name: 'Comandos 2', value:
          '`$ticket support` - Enviar painel de suporte\n' +
          '`$ticket middleman` - Enviar painel de middleman\n' +
          '`$addprofit <@user> <quantidade>` - Adicionar/remover lucro (use negativo para remover)\n' +
          '`$tprofit <@user> <quantidade>` - Definir lucro do usuario\n' +
          '`$profit <@user>` - Mostrar lucro do usuario\n' +
          '`$tnotes <@user> <quantidade>` - Definir notas do usuario\n' +
          '`$addnote <@user> <quantidade> [observacao]` - Adicionar/remover notas\n' +
          '`$notes <@user>` - Mostrar notas do usuario\n' +
          '`$search <@user>` - Pesquisar estatisticas do usuario\n' +
          '`$embed <channel_id>` - Enviar mensagem como embed\n' +
          '`$hit <@user>` - Enviar mensagem de hit\n' +
          '`$tutorial` - Postar embed de tutorial\n' +
          '`$mminfo` - Postar informacoes do middleman'
        },
        { name: 'Comandos 3', value:
          '`$taxamm` - Postar embed de decisao de taxa\n' +
          '`$ban <@user> [motivo]` - Banir membro\n' +
          '`$kick <@user> [motivo]` - Expulsar membro\n' +
          '`$hackban <user_id> [motivo]` - Banir por ID\n' +
          '`$softban <@user> [motivo]` - Softban membro\n' +
          '`$timeout <@user> <duracao> [motivo]` - Silenciar membro (10m, 2h, 1d)\n' +
          '`$unban <user_id>` - Desbanir usuario\n' +
          '`$unhackban <user_id>` - Desfazer hackban\n' +
          '`$untimeout <@user> [motivo]` - Remover silenciamento'
        }
      )
      .setFooter({ text: 'Painel de Admin', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'helpstaff') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Comandos de Staff')
      .setDescription('Todos os comandos $ que membros da staff podem usar.')
      .addFields(
        { name: 'Comandos', value:
          '`$helpstaff` - Mostrar comandos de staff\n' +
          '`$help` - Mostrar comandos publicos\n' +
          '`$profit <@user>` - Mostrar lucro do usuario\n' +
          '`$notes <@user>` - Mostrar notas do usuario\n' +
          '`$search <@user>` - Pesquisar estatisticas do usuario\n' +
          '`$hit <@user>` - Enviar mensagem de hit\n' +
          '`$tutorial` - Postar embed de tutorial'
        },
        { name: 'Comandos 2', value:
          '`$claim` - Reivindicar ticket atual\n' +
          '`$unclaim` - Desfazer reivindicacao do ticket\n' +
          '`$close` - Fechar ticket atual\n' +
          '`$transferir <@user>` - Transferir ticket para outro usuario\n' +
          '`$adicionar <@user>` - Adicionar usuario ao ticket\n' +
          '`$remover <@user>` - Remover usuario do ticket\n' +
          '`$taxamm` - Postar embed de decisao de taxa\n' +
          '`$timeout <@user> <duracao> [motivo]` - Silenciar membro\n' +
          '`$untimeout <@user> [motivo]` - Remover silenciamento'
        }
      )
      .setFooter({ text: 'Painel de Staff', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Comandos Publicos')
      .setDescription('Todos os comandos $ que todos podem usar.')
      .addFields(
        { name: 'Comandos', value:
          '`$help` - Mostrar comandos publicos\n' +
          '`$close` - Fechar seu ticket atual\n' +
          '`$taxamm` - Postar embed de decisao de taxa\n' +
          '`$vouch <@user> <mensagem>` - Enviar vouch para um usuario'
        }
      )
      .setFooter({ text: 'Ajuda', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== TICKET PANELS ====================
  
  else if (command === 'ticket') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const type = args[0]?.toLowerCase();
    
    if (type === 'support') {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Suporte')
        .setDescription('ð¨ â Solicitar suporte!\n\nSomente solicite suporte em casos de:\nDuvidas ou perguntas gerais;\nDenuncias de scam;\nPedir suporte.');
      
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('support_ticket')
            .setPlaceholder('Selecione o tipo de suporte')
            .addOptions([
              {
                label: 'Duvidas ou perguntas gerais',
                value: 'general',
                description: 'Duvidas e perguntas gerais'
              },
              {
                label: 'Denuncias de scam',
                value: 'scam',
                description: 'Reportar um scam'
              },
              {
                label: 'Pedir suporte',
                value: 'support',
                description: 'Solicitar suporte'
              }
            ])
        );
      
      await message.channel.send({ embeds: [embed], components: [row] });
      await log(message.guild, 'ð« Painel de Suporte', `Painel de suporte criado por ${message.author.tag}`, '#57F287');
    }
    
    else if (type === 'middleman') {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Middleman')
        .setDescription('ð¨ â Solicitar MM.\n\nTaxas normais.\n0.99R$ acima de 8R$.\n2.15R$ acima de 100R$.\n4.3R$ acima de 200R$.\n6.8R$ acima de 400R$.\n1.2% acima de 700R$.\nEm contas, e TAXA NORMAL + 2.00R$.\n\nTaxas CrossTrade.\n40c 2 itens\n60c 3+ itens');
      
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('middleman_ticket')
            .setPlaceholder('Selecione o tipo de negociacao')
            .addOptions([
              {
                label: 'Negociacoes ate R$100',
                value: 'mm_100',
                description: 'Negociacoes ate R$100'
              },
              {
                label: 'Negociacoes ate R$250',
                value: 'mm_250',
                description: 'Negociacoes ate R$250'
              },
              {
                label: 'Negociacoes ate R$500',
                value: 'mm_500',
                description: 'Negociacoes ate R$500'
              },
              {
                label: 'Negociacoes ate R$1000',
                value: 'mm_1000',
                description: 'Negociacoes ate R$1000'
              },
              {
                label: 'Negociacoes a partir de R$1000',
                value: 'mm_1000plus',
                description: 'Negociacoes a partir de R$1000'
              },
              {
                label: 'CrossTrade',
                value: 'crosstrade',
                description: 'Troca entre diferentes jogos/plataformas'
              }
            ])
        );
      
      await message.channel.send({ embeds: [embed], components: [row] });
      await log(message.guild, 'ð« Painel de Middleman', `Painel de middleman criado por ${message.author.tag}`, '#57F287');
    }
    
    else {
      message.reply({ embeds: [createErrorEmbed('Uso: `$ticket support` ou `$ticket middleman`')] });
    }
  }
  
  // ==================== CATEGORY CONFIGURATION ====================
  
  else if (command === 'supportcategory') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const categoryId = args[0];
    if (!categoryId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$supportcategory <categoryid>`')] });
    }
    
    const category = message.guild.channels.cache.get(categoryId.replace(/[<#>]/g, ''));
    if (!category || category.type !== ChannelType.GuildCategory) {
      return message.reply({ embeds: [createErrorEmbed('Categoria nao encontrada. Forneca um ID de categoria valido.')] });
    }
    
    botData.supportCategory = category.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Categoria de Suporte Definida')
      .setDescription(`Tickets de suporte serao criados na categoria: **${category.name}**`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'âï¸ Config Atualizada', `Categoria de suporte definida para ${category.name} por ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'middlemancategory') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const categoryId = args[0];
    if (!categoryId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$middlemancategory <categoryid>`')] });
    }
    
    const category = message.guild.channels.cache.get(categoryId.replace(/[<#>]/g, ''));
    if (!category || category.type !== ChannelType.GuildCategory) {
      return message.reply({ embeds: [createErrorEmbed('Categoria nao encontrada. Forneca um ID de categoria valido.')] });
    }
    
    botData.middlemanCategory = category.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Categoria de Middleman Definida')
      .setDescription(`Tickets de middleman serao criados na categoria: **${category.name}**`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'âï¸ Config Atualizada', `Categoria de middleman definida para ${category.name} por ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'logchannel') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$logchannel <channelid>`')] });
    }
    
    const channel = message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ''));
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Canal nao encontrado.')] });
    }
    
    botData.logChannel = channel.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Canal de Logs Definido')
      .setDescription(`Logs serao enviados para: **${channel.name}**`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== MM INFO COMMAND ====================
  
  else if (command === 'mminfo') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('O Middleman tem duas formas de funcionamento.')
      .setDescription(
        '**1 forma:**\n' +
        'O Comprador ira enviar o Pix para o middleman, apos isso, o Vendedor ira entregar os itens para mim ou para o Comprador diretamente. Quando confirmado a entrega, o Middleman envia o Pix ao Vendedor e entrega os itens ao comprador, caso ele decida entregar ao Middleman primeiramente.\n\n' +
        '**2 forma:**\n' +
        'O Vendedor ira entregar os itens ao middleman, apos isso, o Comprador ira enviar o pix para o Vendedor. Quando confirmado o recebimento do pix, o Middleman ira entregar os itens ao Comprador.'
      )
      .setFooter({ text: 'Informacoes do Middleman', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== ROLE CONFIGURATION ====================
  
  else if (command === 'setadmin') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Mencione um cargo. Uso: `$setadmin <@role>`')] });
    }
    
    botData.adminRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Cargo de Admin Definido')
      .setDescription(`Cargo de admin definido para ${role.name}`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'setstaff') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Mencione um cargo. Uso: `$setstaff <@role>`')] });
    }
    
    botData.staffRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Cargo de Staff Definido')
      .setDescription(`Cargo de staff definido para ${role.name}`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'middleman') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const roleId = args[0];
    if (!roleId) {
      return message.reply({ embeds: [createErrorEmbed('Forneca um ID de cargo. Uso: `$middleman <roleid>`')] });
    }
    
    const role = message.guild.roles.cache.get(roleId.replace(/[<@&>]/g, ''));
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Cargo nao encontrado. Forneca um ID de cargo valido.')] });
    }
    
    botData.middlemanRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Cargo de Middleman Definido')
      .setDescription(`Cargo de middleman definido para ${role.name}`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'staff') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const roleId = args[0];
    if (!roleId) {
      return message.reply({ embeds: [createErrorEmbed('Forneca um ID de cargo. Uso: `$staff <roleid>`')] });
    }
    
    const role = message.guild.roles.cache.get(roleId.replace(/[<@&>]/g, ''));
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Cargo nao encontrado. Forneca um ID de cargo valido.')] });
    }
    
    botData.staffRole = role.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Cargo de Staff Definido')
      .setDescription(`Cargo de staff definido para ${role.name}`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'voucher') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Forneca um ID de canal. Uso: `$voucher <channelid>`')] });
    }
    
    const channel = message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ''));
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Canal nao encontrado. Forneca um ID de canal valido.')] });
    }
    
    botData.voucherChannel = channel.id;
    botData.autoVoucherEnabled = true;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Canal de Vouches Definido')
      .setDescription(`Canal de vouches definido para ${channel.name}\nSistema de auto-vouch **ATIVADO**`)
      .setFooter({ text: 'Configuracao', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    startAutoVoucher();
  }
  
  else if (command === 'panel') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ðï¸ Painel de Admin do Auto-Vouch')
      .setDescription('Controle o sistema de auto-vouch')
      .addFields(
        { name: 'Status', value: botData.autoVoucherEnabled ? 'ð¢ Ativado' : 'ð´ Desativado', inline: true },
        { name: 'Canal de Vouches', value: botData.voucherChannel ? `<#${botData.voucherChannel}>` : 'Nao definido', inline: true },
        { name: 'Comandos', value: 
          '`$panel on` - Ativar auto-vouch\n' +
          '`$panel off` - Desativar auto-vouch\n' +
          '`$panel status` - Ver status atual'
        }
      )
      .setFooter({ text: 'Painel de Admin', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    if (args[0] === 'on') {
      botData.autoVoucherEnabled = true;
      saveData();
      startAutoVoucher();
      embed.setDescription('â Sistema de auto-vouch **ATIVADO**');
    } else if (args[0] === 'off') {
      botData.autoVoucherEnabled = false;
      saveData();
      if (voucherInterval) clearTimeout(voucherInterval);
      embed.setDescription('ð´ Sistema de auto-vouch **DESATIVADO**');
    }
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== VOUCH COMMANDS ====================
  
  else if (command === 'vouch' && isAdmin(message.member) && !isNaN(args[0])) {
    const rating = parseInt(args[0]);
    const user = message.mentions.users.first();
    const reviewMessage = args.slice(2).join(' ');
    
    if (!rating || rating < 1 || rating > 5 || !user || !reviewMessage) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$vouch <1-5> <@user> <mensagem>`')] });
    }
    
    if (!botData.voucherChannel) {
      return message.reply({ embeds: [createErrorEmbed('Canal de vouches nao definido. Use `$voucher <channelid>`')] });
    }
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Canal de vouches nao encontrado.')] });
    }
    
    const stars = 'â­'.repeat(rating);
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('â Novo Vouch Recebido!')
      .setDescription(`**${message.author.username}** deixou um vouch para **${user.username}**!`)
      .addFields(
        { name: 'ð Avaliacao', value: reviewMessage, inline: false },
        { name: 'â­ Nota', value: stars, inline: true }
      )
      .setFooter({ text: 'Sistema de Vouches', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch enviado com sucesso!')] });
  }
  
  else if (command === 'vouch') {
    const user = message.mentions.users.first();
    const reviewMessage = args.slice(1).join(' ');
    
    if (!user || !reviewMessage) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$vouch <@user> <mensagem>`')] });
    }
    
    if (!botData.voucherChannel) {
      return message.reply({ embeds: [createErrorEmbed('Canal de vouches nao definido.')] });
    }
    
    const channel = await client.channels.fetch(botData.voucherChannel).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Canal de vouches nao encontrado.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('â Novo Vouch Recebido!')
      .setDescription(`**${message.author.username}** deixou um vouch para **${user.username}**!`)
      .addFields(
        { name: 'ð Avaliacao', value: reviewMessage, inline: false }
      )
      .setFooter({ text: 'Sistema de Vouches', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Vouch enviado com sucesso!')] });
  }
  
  // ==================== PROFIT & NOTES COMMANDS ====================
  
  else if (command === 'addprofit') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$addprofit <@user> <quantidade>` (use negativo para remover)')]});
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].profit += amount;
    botData.users[user.id].history.push({ type: 'profit', amount, date: new Date().toISOString() });
    saveData();
    
    const action = amount >= 0 ? 'Adicionado' : 'Removido';
    const embed = new EmbedBuilder()
      .setColor(amount >= 0 ? '#57F287' : '#ED4245')
      .setTitle(`ð° Lucro ${action}`)
      .setDescription(`${action} $${Math.abs(amount)} ${amount >= 0 ? 'para' : 'de'} ${user.username}`)
      .addFields(
        { name: 'Lucro Total', value: `$${botData.users[user.id].profit}`, inline: true }
      )
      .setFooter({ text: 'Sistema de Lucros', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, `ð° Lucro ${action}`, `${action} $${Math.abs(amount)} ${amount >= 0 ? 'para' : 'de'} ${user.tag} por ${message.author.tag}`, amount >= 0 ? '#57F287' : '#ED4245');
  }
  
  else if (command === 'tprofit') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$tprofit <@user> <quantidade>`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].profit = amount;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° Lucro Definido')
      .setDescription(`Lucro de ${user.username} definido para $${amount}`)
      .setFooter({ text: 'Sistema de Lucros', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð° Lucro Definido', `Lucro de ${user.tag} definido para $${amount} por ${message.author.tag}`);
  }
  
  else if (command === 'profit') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { profit: 0 };
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° Lucro do Usuario')
      .setDescription(`Informacoes de lucro de ${user.username}`)
      .addFields(
        { name: 'Lucro Total', value: `$${userData.profit || 0}`, inline: true }
      )
      .setFooter({ text: 'Sistema de Lucros', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'tnotes') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$tnotes <@user> <quantidade>`')] });
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].notes = amount;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Notas Definidas')
      .setDescription(`Notas de ${user.username} definidas para ${amount}`)
      .setFooter({ text: 'Sistema de Notas', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Notas Definidas', `Notas de ${user.tag} definidas para ${amount} por ${message.author.tag}`);
  }
  
  else if (command === 'addnote') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    const sidenote = args.slice(2).join(' ') || 'Sem observacao';
    
    if (!user || isNaN(amount)) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$addnote <@user> <quantidade> [observacao]` (use negativo para remover)')]});
    }
    
    if (!botData.users[user.id]) botData.users[user.id] = { profit: 0, notes: 0, history: [] };
    botData.users[user.id].notes += amount;
    botData.users[user.id].history.push({ type: 'note', amount, sidenote, date: new Date().toISOString() });
    saveData();
    
    const action = amount >= 0 ? 'Adicionadas' : 'Removidas';
    const embed = new EmbedBuilder()
      .setColor(amount >= 0 ? '#57F287' : '#ED4245')
      .setTitle(`ð Notas ${action}`)
      .setDescription(`${action} ${Math.abs(amount)} notas ${amount >= 0 ? 'para' : 'de'} ${user.username}`)
      .addFields(
        { name: 'Total de Notas', value: `${botData.users[user.id].notes}`, inline: true },
        { name: 'Observacao', value: sidenote, inline: false }
      )
      .setFooter({ text: 'Sistema de Notas', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, `ð Notas ${action}`, `${action} ${Math.abs(amount)} notas ${amount >= 0 ? 'para' : 'de'} ${user.tag} por ${message.author.tag}`, amount >= 0 ? '#57F287' : '#ED4245');
  }
  
  else if (command === 'notes') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { notes: 0, history: [] };
    
    const noteHistory = userData.history?.filter(h => h.type === 'note').slice(-5).map(h => 
      `â¢ ${h.amount > 0 ? '+' : ''}${h.amount} notas - ${h.sidenote || 'Sem nota'} (${new Date(h.date).toLocaleDateString()})`
    ).join('\n') || 'Sem historico de notas';
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Notas do Usuario')
      .setDescription(`Informacoes de notas de ${user.username}`)
      .addFields(
        { name: 'Total de Notas', value: `${userData.notes || 0}`, inline: true },
        { name: 'Historico Recente', value: noteHistory, inline: false }
      )
      .setFooter({ text: 'Sistema de Notas', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'search') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first() || message.author;
    const userData = botData.users[user.id] || { profit: 0, notes: 0, history: [] };
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Resultados da Pesquisa')
      .setDescription(`Informacoes de ${user.username}`)
      .addFields(
        { name: 'ð° Lucro Total', value: `$${userData.profit || 0}`, inline: true },
        { name: 'ð Total de Notas', value: `${userData.notes || 0}`, inline: true },
        { name: 'ð Entradas no Historico', value: `${userData.history?.length || 0}`, inline: true }
      )
      .setFooter({ text: 'Sistema de Pesquisa', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'role_ids') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$role_ids <@role>`')] });
    }
    
    const members = role.members.map(m => `${m.user.username}: ${m.id}`).join('\n') || 'Nenhum membro com este cargo';
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð¥ IDs dos Membros do Cargo')
      .setDescription(`Membros com o cargo: ${role.name}`)
      .addFields(
        { name: 'Membros', value: members.substring(0, 1024) || 'Nenhum' }
      )
      .setFooter({ text: 'Sistema de Cargos', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== MODERATION COMMANDS ====================
  
  else if (command === 'ban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Motivo nao fornecido';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$ban <@user> [motivo]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
    }
    
    try {
      await member.ban({ reason });
      
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('ð¨ Usuario Banido')
        .setDescription(`${user.username} foi banido`)
        .addFields({ name: 'Motivo', value: reason, inline: false })
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'ð¨ Usuario Banido', `${user.tag} foi banido por ${message.author.tag}. Motivo: ${reason}`, '#ED4245');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao banir usuario. Verifique as permissoes.')] });
    }
  }
  
  else if (command === 'kick') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Motivo nao fornecido';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$kick <@user> [motivo]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
    }
    
    try {
      await member.kick(reason);
      
      const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('ð¢ Usuario Expulso')
        .setDescription(`${user.username} foi expulso`)
        .addFields({ name: 'Motivo', value: reason, inline: false })
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'ð¢ Usuario Expulso', `${user.tag} foi expulso por ${message.author.tag}. Motivo: ${reason}`, '#FEE75C');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao expulsar usuario. Verifique as permissoes.')] });
    }
  }
  
  else if (command === 'hackban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'Motivo nao fornecido';
    
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$hackban <user_id> [motivo]`')] });
    }
    
    try {
      await message.guild.members.ban(userId, { reason });
      
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('ð¨ Usuario Hackbanido')
        .setDescription(`ID de usuario ${userId} foi banido`)
        .addFields({ name: 'Motivo', value: reason, inline: false })
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'ð¨ Usuario Hackbanido', `ID ${userId} foi banido por ${message.author.tag}. Motivo: ${reason}`, '#ED4245');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao banir usuario. Verifique se o ID e valido.')] });
    }
  }
  
  else if (command === 'softban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Motivo nao fornecido';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$softban <@user> [motivo]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
    }
    
    try {
      await member.ban({ reason, deleteMessageDays: 1 });
      await message.guild.members.unban(user.id);
      
      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('ð¨ Usuario Softbanido')
        .setDescription(`${user.username} foi softbanido (mensagens deletadas)`)
        .addFields({ name: 'Motivo', value: reason, inline: false })
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'ð¨ Usuario Softbanido', `${user.tag} foi softbanido por ${message.author.tag}. Motivo: ${reason}`, '#ED4245');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao softbanir usuario. Verifique as permissoes.')] });
    }
  }
  
  // FIXED TIMEOUT COMMAND
  else if (command === 'timeout') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const durationStr = args[1];
    const reason = args.slice(2).join(' ') || 'Motivo nao fornecido';
    
    if (!user || !durationStr) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$timeout <@user> <duracao> [motivo]`\nExemplo: `$timeout @user 10m spam`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
    }
    
    const ms = parseDuration(durationStr);
    if (!ms) {
      return message.reply({ embeds: [createErrorEmbed('Duracao invalida. Use formato como: 10m, 2h, 1d, 7d')] });
    }
    
    // Max timeout is 28 days in Discord
    if (ms > 2419200000) {
      return message.reply({ embeds: [createErrorEmbed('Duracao maxima e 28 dias (4 semanas).')] });
    }
    
    try {
      // Discord.js v14 timeout - use disableCommunicationUntil
      const timeoutUntil = new Date(Date.now() + ms);
      await member.disableCommunicationUntil(timeoutUntil, reason);
      
      const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('â±ï¸ Usuario Silenciado')
        .setDescription(`${user.username} foi silenciado`)
        .addFields(
          { name: 'Duracao', value: durationStr, inline: true },
          { name: 'Motivo', value: reason, inline: false }
        )
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'â±ï¸ Usuario Silenciado', `${user.tag} foi silenciado por ${durationStr} por ${message.author.tag}. Motivo: ${reason}`, '#FEE75C');
    } catch (error) {
      console.error('Timeout error:', error);
      message.reply({ embeds: [createErrorEmbed('Erro ao silenciar usuario. Verifique as permissoes e se o bot esta acima do usuario na hierarquia.')] });
    }
  }
  
  // FIXED UNTIMEOUT COMMAND
  else if (command === 'untimeout') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Motivo nao fornecido';
    
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$untimeout <@user> [motivo]`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
    }
    
    try {
      // Remove timeout by setting communication disabled until to null
      await member.disableCommunicationUntil(null, reason);
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('â Silenciamento Removido')
        .setDescription(`O silenciamento de ${user.username} foi removido`)
        .addFields({ name: 'Motivo', value: reason, inline: false })
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'â Silenciamento Removido', `Silenciamento de ${user.tag} removido por ${message.author.tag}. Motivo: ${reason}`, '#57F287');
    } catch (error) {
      console.error('Untimeout error:', error);
      message.reply({ embeds: [createErrorEmbed('Erro ao remover silenciamento. Verifique as permissoes.')] });
    }
  }
  
  else if (command === 'unban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const userId = args[0];
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$unban <user_id>`')] });
    }
    
    try {
      await message.guild.members.unban(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('â Usuario Desbanido')
        .setDescription(`ID de usuario ${userId} foi desbanido`)
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'â Usuario Desbanido', `ID ${userId} foi desbanido por ${message.author.tag}`, '#57F287');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao desbanir usuario. Verifique se o ID esta correto.')] });
    }
  }
  
  else if (command === 'unhackban') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const userId = args[0];
    if (!userId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$unhackban <user_id>`')] });
    }
    
    try {
      await message.guild.members.unban(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('â Hackban Removido')
        .setDescription(`ID de usuario ${userId} foi desbanido`)
        .setFooter({ text: 'Moderacao', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      await log(message.guild, 'â Hackban Removido', `ID ${userId} foi desbanido por ${message.author.tag}`, '#57F287');
    } catch (error) {
      message.reply({ embeds: [createErrorEmbed('Erro ao remover hackban. Verifique se o ID esta correto.')] });
    }
  }
  
  // ==================== UTILITY COMMANDS ====================
  
  else if (command === 'embed') {
    if (!isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const channelId = args[0];
    if (!channelId) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$embed <channel_id>`')] });
    }
    
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, '')).catch(() => null);
    if (!channel) {
      return message.reply({ embeds: [createErrorEmbed('Canal nao encontrado.')] });
    }
    
    const filter = m => m.author.id === message.author.id;
    message.reply('Envie a mensagem que deseja transformar em embed:');
    
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
    if (!collected.size) {
      return message.reply('Tempo esgotado - nenhuma mensagem recebida.');
    }
    
    const embedContent = collected.first().content;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setDescription(embedContent)
      .setFooter({ text: `Enviado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    message.reply({ embeds: [createSuccessEmbed('Embed enviado com sucesso!')] });
  }
  
  else if (command === 'hit') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$hit <@user>`')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð¯ Mensagem de Hit')
      .setDescription(`Ei ${user}, voce foi hitado! Por favor responda esta mensagem.`)
      .setFooter({ text: 'Sistema de Hit', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ content: `<@${user.id}>`, embeds: [embed] });
  }
  
  else if (command === 'tutorial') {
    if (!isStaff(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para usar este comando.')] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Como Usar Nosso Servico de Middleman')
      .setDescription('Bem-vindo! Veja como funciona nosso servico de middleman:')
      .addFields(
        { name: 'ð Passo 1', value: 'Crie um ticket usando o menu abaixo ou digite `$close` para fechar seu ticket.', inline: false },
        { name: 'ð¤ Passo 2', value: 'Aguarde um middleman reivindicar seu ticket.', inline: false },
        { name: 'ð° Passo 3', value: 'Siga as instrucoes do middleman para completar sua troca com seguranca.', inline: false },
        { name: 'â Passo 4', value: 'Quando a troca for concluida, deixe um vouch usando `$vouch @middleman <mensagem>`!', inline: false }
      )
      .setFooter({ text: 'Tutorial', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'taxamm') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð° Decisao de Taxa do Middleman')
      .setDescription('Selecione quem pagara a taxa do middleman:')
      .addFields(
        { name: 'Opcao 1', value: 'Comprador paga a taxa', inline: true },
        { name: 'Opcao 2', value: 'Vendedor paga a taxa', inline: true },
        { name: 'Opcao 3', value: 'Dividir 50/50', inline: true }
      )
      .setFooter({ text: 'Sistema de Taxas', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== TICKET COMMANDS ====================
  
  else if (command === 'claim') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Apenas middlemen podem reivindicar tickets.')] });
    }
    
    if (!botData.tickets[message.channel.id]) {
      botData.tickets[message.channel.id] = {};
    }
    
    botData.tickets[message.channel.id].claimedBy = message.author.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('â Ticket Reivindicado')
      .setDescription(`Este ticket foi reivindicado por ${message.author.username}`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'â Ticket Reivindicado', `Ticket ${message.channel.name} reivindicado por ${message.author.tag}`, '#57F287');
  }
  
  else if (command === 'unclaim') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Apenas middlemen podem desfazer reivindicacao.')] });
    }
    
    if (botData.tickets[message.channel.id]?.claimedBy !== message.author.id && !isAdmin(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Voce so pode desfazer reivindicacao de tickets que voce reivindicou.')] });
    }
    
    if (botData.tickets[message.channel.id]) {
      delete botData.tickets[message.channel.id].claimedBy;
      saveData();
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('ð Ticket Liberado')
      .setDescription(`Este ticket agora esta liberado`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Ticket Liberado', `Ticket ${message.channel.name} liberado por ${message.author.tag}`, '#FEE75C');
  }
  
  else if (command === 'close') {
    const ticket = botData.tickets[message.channel.id];
    
    if (!isStaff(message.member) && ticket?.claimedBy !== message.author.id) {
      const channelName = message.channel.name;
      if (!channelName.includes(message.author.username.toLowerCase()) && !isStaff(message.member)) {
        return message.reply({ embeds: [createErrorEmbed('Voce nao tem permissao para fechar este ticket.')] });
      }
    }
    
    // Create transcript
    const transcript = await createTranscript(message.channel, message.author);
    const transcriptBuffer = Buffer.from(transcript, 'utf-8');
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('ð Fechando Ticket')
      .setDescription('Este ticket sera fechado em 5 segundos...')
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
    
    // Send transcript to log channel
    if (botData.logChannel) {
      const logCh = await message.guild.channels.fetch(botData.logChannel).catch(() => null);
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('ð Ticket Fechado')
          .setDescription(`Ticket: ${message.channel.name}\nFechado por: ${message.author.tag}`)
          .setTimestamp();
        
        await logCh.send({ 
          embeds: [logEmbed], 
          files: [{ attachment: transcriptBuffer, name: `transcricao-${message.channel.name}.txt` }] 
        });
      }
    }
    
    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 5000);
  }
  
  else if (command === 'transferir') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Apenas middlemen podem transferir tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$transferir <@user>`')] });
    }
    
    const member = message.guild.members.cache.get(user.id);
    if (!isMiddleman(member)) {
      return message.reply({ embeds: [createErrorEmbed('So pode transferir para outros middlemen.')] });
    }
    
    if (!botData.tickets[message.channel.id]) {
      botData.tickets[message.channel.id] = {};
    }
    
    botData.tickets[message.channel.id].claimedBy = user.id;
    saveData();
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð Ticket Transferido')
      .setDescription(`Este ticket foi transferido para ${user.username}`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
    await log(message.guild, 'ð Ticket Transferido', `Ticket ${message.channel.name} transferido para ${user.tag} por ${message.author.tag}`);
  }
  
  else if (command === 'adicionar') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Apenas middlemen podem adicionar usuarios aos tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$adicionar <@user>`')] });
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
      .setTitle('â Usuario Adicionado')
      .setDescription(`${user.username} foi adicionado a este ticket`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  else if (command === 'remover') {
    if (!isMiddleman(message.member)) {
      return message.reply({ embeds: [createErrorEmbed('Apenas middlemen podem remover usuarios dos tickets.')] });
    }
    
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$remover <@user>`')] });
    }
    
    await message.channel.permissionOverwrites.delete(user.id);
    
    if (botData.tickets[message.channel.id]?.addedUsers) {
      botData.tickets[message.channel.id].addedUsers = botData.tickets[message.channel.id].addedUsers.filter(id => id !== user.id);
      saveData();
    }
    
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('â Usuario Removido')
      .setDescription(`${user.username} foi removido deste ticket`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    message.channel.send({ embeds: [embed] });
  }
  
  // ==================== ADD USER COMMAND ====================
  
  else if (command === 'add') {
    if (!args[0]) {
      return message.reply({ embeds: [createErrorEmbed('Uso: `$add <user_id>`')] });
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
        .setTitle('â Usuario Adicionado')
        .setDescription(`${member.user.username} foi adicionado a este ticket`)
        .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      return message.reply({ embeds: [createErrorEmbed('Usuario nao encontrado neste servidor.')] });
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
      return interaction.reply({ embeds: [createErrorEmbed('Categoria de suporte nao definida. Contate um admin.')], ephemeral: true });
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
      name: `suporte-${typeLabels[value]}-${ticketNumber}`,
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
      .setTitle('ð« Ticket de Suporte')
      .setDescription(`Bem-vindo <@${user.id}>! Um membro da staff ira ajuda-lo em breve.\n\nTipo: **${typeLabels[value]}**`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });
    await log(guild, 'ð« Ticket de Suporte Criado', `Ticket ${channel.name} criado por ${user.tag}`);
  }
  
  else if (customId === 'middleman_ticket') {
    if (!botData.middlemanCategory) {
      return interaction.reply({ embeds: [createErrorEmbed('Categoria de middleman nao definida. Contate um admin.')], ephemeral: true });
    }
    
    botData.ticketCounter++;
    saveData();
    
    const ticketNumber = botData.ticketCounter.toString().padStart(4, '0');
    const tradeAmounts = {
      'mm_100': 'ate-100',
      'mm_250': 'ate-250',
      'mm_500': 'ate-500',
      'mm_1000': 'ate-1000',
      'mm_1000plus': '1000plus',
      'crosstrade': 'crosstrade'
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
    
    const typeNames = {
      'mm_100': 'ate R$100',
      'mm_250': 'ate R$250',
      'mm_500': 'ate R$500',
      'mm_1000': 'ate R$1000',
      'mm_1000plus': 'a partir de R$1000',
      'crosstrade': 'CrossTrade'
    };
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('ð« Ticket de Middleman')
      .setDescription(`Bem-vindo <@${user.id}>!\n\nTipo de Negociacao: **${typeNames[value]}**\n\nPor favor, forneca o ID da outra parte nesta troca (se houver). Use \`$add <user_id>\` para adiciona-los.`)
      .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
    
    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });
    await log(guild, 'ð« Ticket de Middleman Criado', `Ticket ${channel.name} criado por ${user.tag}`);
  }
});

// Helper functions
function createErrorEmbed(description) {
  return new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('â Erro')
    .setDescription(description)
    .setTimestamp();
}

function createSuccessEmbed(description) {
  return new EmbedBuilder()
    .setColor('#57F287')
    .setTitle('â Sucesso')
    .setDescription(description)
    .setTimestamp();
}

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    's': 1000,
    'm': 60000,
    'h': 3600000,
    'd': 86400000,
    'w': 604800000
  };
  
  return value * multipliers[unit];
}

// Login
client.login(process.env.DISCORD_TOKEN);
