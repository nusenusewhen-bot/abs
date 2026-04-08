const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Data management
const dataPath = path.join(__dirname, 'data.json');
let data = { users: {}, tickets: {}, profits: {}, settings: {}, vouchers: [], autoVoucherConfig: { senders: [], receivers: [] }, vouchCounter: 0 };

function loadData() {
    try {
        if (fs.existsSync(dataPath)) {
            data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            if (!data.autoVoucherConfig) data.autoVoucherConfig = { senders: [], receivers: [] };
            if (!data.vouchCounter) data.vouchCounter = 0;
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function saveData() {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

loadData();

// Bot setup with all intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

// Safe channel fetch helper
async function safeFetchChannel(channelId) {
    try {
        if (!channelId) return null;
        const channel = await client.channels.fetch(channelId).catch(() => null);
        return channel;
    } catch (e) {
        return null;
    }
}

// Safe member fetch helper
async function safeFetchMember(guild, userId) {
    try {
        if (!guild || !userId) return null;
        const member = await guild.members.fetch(userId).catch(() => null);
        return member;
    } catch (e) {
        return null;
    }
}

// Safe send message helper
async function safeSendMessage(channel, content) {
    try {
        if (!channel) return null;
        return await channel.send(content).catch(() => null);
    } catch (e) {
        return null;
    }
}

// Bot ready
client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    setInterval(sendAutoVoucher, 300000); // 5 minutes
});

// Check if user is admin
function isAdmin(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
           (data.settings.admins && data.settings.admins.includes(member.id));
}

// Check if user is staff
function isStaff(member) {
    return isAdmin(member) || 
           (data.settings.staff && data.settings.staff.includes(member.id)) ||
           member.roles.cache.some(r => 
               r.name.toLowerCase().includes('staff') || 
               r.name.toLowerCase().includes('equipe')
           );
}

// Check if user is middleman
function isMiddleman(member) {
    return member.roles.cache.some(r => r.name.toLowerCase().includes('middleman'));
}

// Generate transcript
async function generateTranscript(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
        const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        let transcript = `=== TICKET TRANSCRIPT: ${channel.name} ===\n\n`;
        sorted.forEach(msg => {
            const time = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
            transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
            if (msg.embeds.length > 0) {
                msg.embeds.forEach(embed => {
                    if (embed.title) transcript += `  [Embed Title: ${embed.title}]\n`;
                    if (embed.description) transcript += `  [Embed: ${embed.description}]\n`;
                });
            }
        });
        return transcript;
    } catch (e) {
        return 'Error generating transcript';
    }
}

// Auto voucher system with configurable senders/receivers
function sendAutoVoucher() {
    const config = data.autoVoucherConfig;
    if (!config || !config.senders || !config.receivers || config.senders.length === 0 || config.receivers.length === 0) return;
    
    const senderId = config.senders[Math.floor(Math.random() * config.senders.length)];
    const receiverId = config.receivers[Math.floor(Math.random() * config.receivers.length)];
    if (senderId === receiverId) return;
    
    const sender = client.users.cache.get(senderId);
    const receiver = client.users.cache.get(receiverId);
    if (!sender || !receiver) return;
    
    data.vouchCounter = (data.vouchCounter || 0) + 1;
    const vouchNumber = data.vouchCounter;
    
    const vouchEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('New vouch created!')
        .setDescription(`â­â­â­â­â­\n\n**Vouch #${vouchNumber}**`)
        .addFields(
            { name: 'Vouched for', value: `<@${receiverId}>`, inline: true },
            { name: 'Vouched by', value: `<@${senderId}>`, inline: true },
            { name: 'Vouched at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'Thank you for vouching!' })
        .setTimestamp();
    
    data.vouchers.push({
        id: vouchNumber,
        sender: senderId,
        receiver: receiverId,
        timestamp: Date.now()
    });
    saveData();
    
    const voucherChannelId = data.settings?.voucherChannel;
    if (voucherChannelId) {
        safeSendMessage({ id: voucherChannelId, send: (c) => client.channels.cache.get(voucherChannelId)?.send(c) }, { embeds: [vouchEmbed] });
    }
}

// Message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content;
    const args = content.split(' ');
    const command = args[0].toLowerCase();
    const member = message.member;
    const guild = message.guild;
    
    // ========== PUBLIC COMMANDS ==========
    
    if (command === '$help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Central de Ajuda - Usuario')
            .setDescription('Comandos disponiveis para todos os usuarios:')
            .addFields(
                { name: '$help', value: 'Mostra esta mensagem de ajuda', inline: false },
                { name: '$close', value: 'Fecha o ticket atual', inline: false },
                { name: '$taxamm <valor>', value: 'Calcula a taxa do middleman', inline: false },
                { name: '$vouch', value: 'Cria um vouch para um usuario', inline: false },
                { name: '$middleman', value: 'Abre um ticket de middleman', inline: false },
                { name: '$staff', value: 'Abre um ticket de suporte', inline: false }
            )
            .setFooter({ text: 'Bot de Middleman' })
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [helpEmbed] });
    }
    
    if (command === '$taxamm') {
        const amount = parseFloat(args[1]);
        if (isNaN(amount)) {
            await safeSendMessage(message.channel, 'Use: $taxamm <valor>');
            return;
        }
        const fee = amount * 0.05;
        const total = amount + fee;
        const taxEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('Calculadora de Taxa Middleman')
            .addFields(
                { name: 'Valor', value: `R$ ${amount.toFixed(2)}`, inline: true },
                { name: 'Taxa (5%)', value: `R$ ${fee.toFixed(2)}`, inline: true },
                { name: 'Total', value: `R$ ${total.toFixed(2)}`, inline: true }
            )
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [taxEmbed] });
    }
    
    if (command === '$vouch') {
        const target = message.mentions.users.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario para vouch. Use: $vouch @usuario');
            return;
        }
        
        data.vouchCounter = (data.vouchCounter || 0) + 1;
        const vouchNumber = data.vouchCounter;
        
        const vouchEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('New vouch created!')
            .setDescription(`â­â­â­â­â­\n\n**Vouch #${vouchNumber}**`)
            .addFields(
                { name: 'Vouched for', value: `<@${target.id}>`, inline: true },
                { name: 'Vouched by', value: `<@${message.author.id}>`, inline: true },
                { name: 'Vouched at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: 'Thank you for vouching!' })
            .setTimestamp();
        
        data.vouchers.push({
            id: vouchNumber,
            sender: message.author.id,
            receiver: target.id,
            timestamp: Date.now()
        });
        saveData();
        
        await safeSendMessage(message.channel, { embeds: [vouchEmbed] });
    }
    
    if (command === '$middleman') {
        await createTicket(message, 'middleman');
    }
    
    if (command === '$staff') {
        await createTicket(message, 'suporte');
    }
    
    if (command === '$close') {
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        const transcript = await generateTranscript(message.channel);
        const transcriptBuffer = Buffer.from(transcript, 'utf8');
        
        const logChannelId = data.settings?.logChannel;
        if (logChannelId) {
            const logChannel = await safeFetchChannel(logChannelId);
            if (logChannel) {
                const closeEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Ticket Fechado')
                    .addFields(
                        { name: 'Canal', value: message.channel.name, inline: true },
                        { name: 'Fechado por', value: `<@${message.author.id}>`, inline: true }
                    )
                    .setTimestamp();
                await safeSendMessage(logChannel, { 
                    embeds: [closeEmbed],
                    files: [{ attachment: transcriptBuffer, name: `${message.channel.name}-transcript.txt` }]
                });
            }
        }
        
        await message.channel.delete().catch(() => {});
    }
    
    // ========== STAFF COMMANDS ==========
    
    if (command === '$helpstaff') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Central de Ajuda - Staff')
            .setDescription('Comandos disponiveis para staff:')
            .addFields(
                { name: '$helpstaff', value: 'Mostra esta mensagem de ajuda', inline: false },
                { name: '$claim', value: 'Reivindica o ticket atual', inline: false },
                { name: '$unclaim', value: 'Desfaz a reivindicacao do ticket', inline: false },
                { name: '$close', value: 'Fecha o ticket atual', inline: false },
                { name: '$transferir @usuario', value: 'Transfere o ticket para outro usuario', inline: false },
                { name: '$adicionar @usuario', value: 'Adiciona um usuario ao ticket', inline: false },
                { name: '$remover @usuario', value: 'Remove um usuario do ticket', inline: false }
            )
            .setFooter({ text: 'Bot de Middleman - Staff' })
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [helpEmbed] });
    }
    
    if (command === '$claim') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        const ticketData = data.tickets[message.channel.id] || {};
        ticketData.claimedBy = message.author.id;
        data.tickets[message.channel.id] = ticketData;
        saveData();
        
        const claimEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Ticket Reivindicado')
            .setDescription(`Este ticket foi reivindicado por <@${message.author.id}>`)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [claimEmbed] });
        
        // Update channel topic
        await message.channel.setTopic(`Ticket de: ${ticketData.userTag} | Reivindicado por: ${message.author.tag}`).catch(() => {});
    }
    
    if (command === '$unclaim') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        const ticketData = data.tickets[message.channel.id] || {};
        ticketData.claimedBy = null;
        data.tickets[message.channel.id] = ticketData;
        saveData();
        
        const unclaimEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Ticket Desreivindicado')
            .setDescription('Este ticket nao esta mais reivindicado.')
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [unclaimEmbed] });
        
        await message.channel.setTopic(`Ticket de: ${ticketData.userTag} | Nao reivindicado`).catch(() => {});
    }
    
    if (command === '$transferir') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario para transferir. Use: $transferir @usuario');
            return;
        }
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        await message.channel.permissionOverwrites.create(target, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        }).catch(() => {});
        
        const ticketData = data.tickets[message.channel.id] || {};
        ticketData.claimedBy = target.id;
        data.tickets[message.channel.id] = ticketData;
        saveData();
        
        const transferEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Ticket Transferido')
            .setDescription(`Ticket transferido para <@${target.id}>`)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [transferEmbed] });
    }
    
    if (command === '$adicionar') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario para adicionar. Use: $adicionar @usuario');
            return;
        }
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        await message.channel.permissionOverwrites.create(target, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        }).catch(() => {});
        
        const addEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Usuario Adicionado')
            .setDescription(`<@${target.id}> foi adicionado ao ticket.`)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [addEmbed] });
    }
    
    if (command === '$remover') {
        if (!isStaff(member)) {
            await safeSendMessage(message.channel, 'Apenas staff pode usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario para remover. Use: $remover @usuario');
            return;
        }
        if (!message.channel.name.startsWith('ticket-')) {
            await safeSendMessage(message.channel, 'Este comando so funciona em canais de ticket!');
            return;
        }
        
        await message.channel.permissionOverwrites.delete(target).catch(() => {});
        
        const removeEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Usuario Removido')
            .setDescription(`<@${target.id}> foi removido do ticket.`)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [removeEmbed] });
    }
    
    // ========== ADMIN COMMANDS ==========
    
    if (command === '$helpadmin') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Central de Ajuda - Admin')
            .setDescription('Comandos disponiveis para administradores:')
            .addFields(
                { name: '$helpadmin', value: 'Mostra esta mensagem de ajuda', inline: false },
                { name: '$setadmin @usuario', value: 'Define um usuario como admin', inline: false },
                { name: '$setstaff @usuario', value: 'Define um usuario como staff', inline: false },
                { name: '$vouch @usuario', value: 'Cria um vouch para um usuario', inline: false },
                { name: '$panel <tipo>', value: 'Envia um painel de tickets (ticket1, ticket2, support, middleman)', inline: false },
                { name: '$role_ids', value: 'Mostra os IDs dos cargos', inline: false },
                { name: '$addprofit @usuario <valor>', value: 'Adiciona lucro a um usuario', inline: false },
                { name: '$tprofit @usuario <valor>', value: 'Define o limite de lucro de um usuario', inline: false },
                { name: '$profit @usuario', value: 'Mostra o lucro de um usuario', inline: false },
                { name: '$tnotes @usuario <valor>', value: 'Define o limite de vendas de cargos', inline: false },
                { name: '$addnote @usuario <valor>', value: 'Adiciona venda de cargo a um usuario', inline: false },
                { name: '$notes @usuario', value: 'Mostra as vendas de cargos de um usuario', inline: false },
                { name: '$search @usuario', value: 'Mostra informacoes completas de um usuario', inline: false },
                { name: '$embed', value: 'Cria um embed personalizado', inline: false },
                { name: '$hit <mensagem>', value: 'Envia uma mensagem de hit', inline: false },
                { name: '$tutorial', value: 'Envia o tutorial do bot', inline: false },
                { name: '$ticket1', value: 'Envia o painel de leilao', inline: false },
                { name: '$ticket2', value: 'Envia o painel de compra de cargos', inline: false },
                { name: '$ticket support', value: 'Envia o painel de suporte', inline: false },
                { name: '$ticket middleman', value: 'Envia o painel de middleman', inline: false },
                { name: '$voucherpanel', value: 'Painel de configuracao do auto-voucher', inline: false },
                { name: '$addsender <id>', value: 'Adiciona um sender ao auto-voucher', inline: false },
                { name: '$addreceiver <id>', value: 'Adiciona um receiver ao auto-voucher', inline: false },
                { name: '$listsenders', value: 'Lista os senders do auto-voucher', inline: false },
                { name: '$listreceivers', value: 'Lista os receivers do auto-voucher', inline: false },
                { name: 'Timeout', value: '$timeout @usuario <tempo> - Da timeout em um usuario\n$removetimeout @usuario - Remove timeout', inline: false },
                { name: 'Ban/Kick', value: '$ban @usuario <motivo> - Bane um usuario\n$kick @usuario <motivo> - Expulsa um usuario\n$unban <id> - Desbane um usuario', inline: false },
                { name: 'Mute', value: '$mute @usuario - Muta um usuario\n$unmute @usuario - Desmuta um usuario', inline: false },
                { name: 'Warn', value: '$warn @usuario <motivo> - Adverte um usuario\n$warns @usuario - Mostra advertencias', inline: false },
                { name: 'Clear', value: '$clear <quantidade> - Limpa mensagens', inline: false }
            )
            .setFooter({ text: 'Bot de Middleman - Admin' })
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [helpEmbed] });
    }
    
    if (command === '$setadmin') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario. Use: $setadmin @usuario');
            return;
        }
        if (!data.settings.admins) data.settings.admins = [];
        if (!data.settings.admins.includes(target.id)) {
            data.settings.admins.push(target.id);
            saveData();
        }
        await safeSendMessage(message.channel, `<@${target.id}> foi definido como admin!`);
    }
    
    if (command === '$setstaff') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario. Use: $setstaff @usuario');
            return;
        }
        if (!data.settings.staff) data.settings.staff = [];
        if (!data.settings.staff.includes(target.id)) {
            data.settings.staff.push(target.id);
            saveData();
        }
        await safeSendMessage(message.channel, `<@${target.id}> foi definido como staff!`);
    }
    
    if (command === '$panel') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const type = args[1]?.toLowerCase();
        if (type === 'ticket1') {
            await sendTicket1Panel(message.channel);
        } else if (type === 'ticket2') {
            await sendTicket2Panel(message.channel);
        } else if (type === 'support' || type === 'suporte') {
            await sendSupportPanel(message.channel);
        } else if (type === 'middleman') {
            await sendMiddlemanPanel(message.channel);
        } else {
            await safeSendMessage(message.channel, 'Tipos disponiveis: ticket1, ticket2, support, middleman');
        }
    }
    
    if (command === '$ticket1') {
        if (!isAdmin(member)) return;
        await sendTicket1Panel(message.channel);
    }
    
    if (command === '$ticket2') {
        if (!isAdmin(member)) return;
        await sendTicket2Panel(message.channel);
    }
    
    if (command === '$ticket') {
        if (!isAdmin(member)) return;
        const type = args[1]?.toLowerCase();
        if (type === 'support' || type === 'suporte') {
            await sendSupportPanel(message.channel);
        } else if (type === 'middleman') {
            await sendMiddlemanPanel(message.channel);
        }
    }
    
    if (command === '$role_ids') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const roles = guild.roles.cache.map(r => `${r.name}: ${r.id}`).join('\n');
        const rolesEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('IDs dos Cargos')
            .setDescription(`\`\`\`${roles}\`\`\``)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [rolesEmbed] });
    }
    
    if (command === '$addprofit') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        const amount = parseFloat(args[2]);
        if (!target || isNaN(amount)) {
            await safeSendMessage(message.channel, 'Use: $addprofit @usuario <valor>');
            return;
        }
        if (!data.profits[target.id]) {
            data.profits[target.id] = { profit: 0, tprofit: 0, notes: 0, tnotes: 0, history: [] };
        }
        data.profits[target.id].profit += amount;
        data.profits[target.id].history.push({ type: 'addprofit', amount, timestamp: Date.now() });
        saveData();
        await safeSendMessage(message.channel, `Adicionado R$ ${amount} de lucro para <@${target.id}>. Total: R$ ${data.profits[target.id].profit}`);
    }
    
    if (command === '$tprofit') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        const amount = parseFloat(args[2]);
        if (!target || isNaN(amount)) {
            await safeSendMessage(message.channel, 'Use: $tprofit @usuario <valor>');
            return;
        }
        if (!data.profits[target.id]) {
            data.profits[target.id] = { profit: 0, tprofit: 0, notes: 0, tnotes: 0, history: [] };
        }
        data.profits[target.id].tprofit = amount;
        saveData();
        await safeSendMessage(message.channel, `Limite de lucro de <@${target.id}> definido para R$ ${amount}`);
    }
    
    if (command === '$profit') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first() || message.author;
        const profitData = data.profits[target.id] || { profit: 0, tprofit: 0, notes: 0, tnotes: 0 };
        const profitEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Lucro de ${target.tag}`)
            .addFields(
                { name: 'Lucro Atual', value: `R$ ${profitData.profit || 0}`, inline: true },
                { name: 'Limite de Lucro', value: `R$ ${profitData.tprofit || 0}`, inline: true }
            )
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [profitEmbed] });
    }
    
    if (command === '$tnotes') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        const amount = parseFloat(args[2]);
        if (!target || isNaN(amount)) {
            await safeSendMessage(message.channel, 'Use: $tnotes @usuario <valor>');
            return;
        }
        if (!data.profits[target.id]) {
            data.profits[target.id] = { profit: 0, tprofit: 0, notes: 0, tnotes: 0, history: [] };
        }
        data.profits[target.id].tnotes = amount;
        saveData();
        await safeSendMessage(message.channel, `Limite de vendas de cargos de <@${target.id}> definido para R$ ${amount}`);
    }
    
    if (command === '$addnote') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        const amount = parseFloat(args[2]);
        if (!target || isNaN(amount)) {
            await safeSendMessage(message.channel, 'Use: $addnote @usuario <valor>');
            return;
        }
        if (!data.profits[target.id]) {
            data.profits[target.id] = { profit: 0, tprofit: 0, notes: 0, tnotes: 0, history: [] };
        }
        data.profits[target.id].notes += amount;
        data.profits[target.id].history.push({ type: 'addnote', amount, timestamp: Date.now() });
        saveData();
        await safeSendMessage(message.channel, `Adicionado R$ ${amount} em vendas de cargos para <@${target.id}>. Total: R$ ${data.profits[target.id].notes}`);
    }
    
    if (command === '$notes') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first() || message.author;
        const profitData = data.profits[target.id] || { profit: 0, tprofit: 0, notes: 0, tnotes: 0 };
        const notesEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Vendas de Cargos de ${target.tag}`)
            .addFields(
                { name: 'Vendas Atuais', value: `R$ ${profitData.notes || 0}`, inline: true },
                { name: 'Limite de Vendas', value: `R$ ${profitData.tnotes || 0}`, inline: true }
            )
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [notesEmbed] });
    }
    
    if (command === '$search') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Mencione um usuario. Use: $search @usuario');
            return;
        }
        const profitData = data.profits[target.id] || { profit: 0, tprofit: 0, notes: 0, tnotes: 0, history: [] };
        
        let historyText = '';
        if (profitData.history && profitData.history.length > 0) {
            historyText = profitData.history.slice(-10).map(h => {
                const date = new Date(h.timestamp).toLocaleDateString('pt-BR');
                return `${date}: ${h.type} - R$ ${h.amount}`;
            }).join('\n');
        } else {
            historyText = 'Sem historico';
        }
        
        const searchEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Informacoes de ${target.tag}`)
            .addFields(
                { name: 'Lucro', value: `R$ ${profitData.profit || 0}`, inline: true },
                { name: 'Vendas de Cargos', value: `R$ ${profitData.notes || 0}`, inline: true },
                { name: 'Limite de Lucro', value: `R$ ${profitData.tprofit || 0}`, inline: true },
                { name: 'Limite de Vendas', value: `R$ ${profitData.tnotes || 0}`, inline: true },
                { name: 'Historico', value: historyText, inline: false }
            )
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [searchEmbed] });
    }
    
    if (command === '$embed') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const embedText = args.slice(1).join(' ');
        if (!embedText) {
            await safeSendMessage(message.channel, 'Use: $embed <titulo> | <descricao> | [cor]');
            return;
        }
        const parts = embedText.split('|').map(p => p.trim());
        const title = parts[0] || 'Embed';
        const description = parts[1] || '';
        const color = parts[2] ? parseInt(parts[2].replace('#', ''), 16) : 0x0099FF;
        
        const customEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [customEmbed] });
    }
    
    if (command === '$hit') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const hitMessage = args.slice(1).join(' ');
        if (!hitMessage) {
            await safeSendMessage(message.channel, 'Use: $hit <mensagem>');
            return;
        }
        const hitEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('HIT')
            .setDescription(hitMessage)
            .setImage('https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif')
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [hitEmbed] });
    }
    
    if (command === '$tutorial') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const tutorialEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Tutorial do Bot')
            .setDescription('Bem-vindo ao tutorial do bot de middleman!')
            .addFields(
                { name: 'Como usar tickets', value: 'Use $middleman ou $staff para abrir tickets', inline: false },
                { name: 'Como reivindicar', value: 'Staff use $claim para reivindicar tickets', inline: false },
                { name: 'Como fechar', value: 'Use $close para fechar tickets', inline: false },
                { name: 'Como calcular taxas', value: 'Use $taxamm <valor> para calcular taxas', inline: false }
            )
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [tutorialEmbed] });
    }
    
    // Auto-voucher configuration commands
    if (command === '$voucherpanel') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        await sendVoucherPanel(message.channel);
    }
    
    if (command === '$addsender') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const userId = args[1];
        if (!userId) {
            await safeSendMessage(message.channel, 'Use: $addsender <id>');
            return;
        }
        if (!data.autoVoucherConfig) data.autoVoucherConfig = { senders: [], receivers: [] };
        if (!data.autoVoucherConfig.senders.includes(userId)) {
            data.autoVoucherConfig.senders.push(userId);
            saveData();
        }
        await safeSendMessage(message.channel, `Usuario ${userId} adicionado aos senders!`);
    }
    
    if (command === '$addreceiver') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const userId = args[1];
        if (!userId) {
            await safeSendMessage(message.channel, 'Use: $addreceiver <id>');
            return;
        }
        if (!data.autoVoucherConfig) data.autoVoucherConfig = { senders: [], receivers: [] };
        if (!data.autoVoucherConfig.receivers.includes(userId)) {
            data.autoVoucherConfig.receivers.push(userId);
            saveData();
        }
        await safeSendMessage(message.channel, `Usuario ${userId} adicionado aos receivers!`);
    }
    
    if (command === '$listsenders') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const senders = data.autoVoucherConfig?.senders || [];
        await safeSendMessage(message.channel, `Senders: ${senders.join(', ') || 'Nenhum'}`);
    }
    
    if (command === '$listreceivers') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const receivers = data.autoVoucherConfig?.receivers || [];
        await safeSendMessage(message.channel, `Receivers: ${receivers.join(', ') || 'Nenhum'}`);
    }
    
    // Moderation commands
    if (command === '$timeout') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        const timeStr = args[2];
        if (!target || !timeStr) {
            await safeSendMessage(message.channel, 'Use: $timeout @usuario <tempo> (ex: 10m, 1h, 1d)');
            return;
        }
        
        let ms = 0;
        if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60000;
        else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 3600000;
        else if (timeStr.endsWith('d')) ms = parseInt(timeStr) * 86400000;
        else ms = parseInt(timeStr) * 60000;
        
        try {
            await target.disableCommunicationUntil(Date.now() + ms, `Timeout by ${message.author.tag}`);
            await safeSendMessage(message.channel, `<@${target.id}> recebeu timeout por ${timeStr}!`);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao aplicar timeout!');
        }
    }
    
    if (command === '$removetimeout') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $removetimeout @usuario');
            return;
        }
        try {
            await target.disableCommunicationUntil(null);
            await safeSendMessage(message.channel, `Timeout removido de <@${target.id}>!`);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao remover timeout!');
        }
    }
    
    if (command === '$ban') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $ban @usuario <motivo>');
            return;
        }
        try {
            await target.ban({ reason });
            await safeSendMessage(message.channel, `<@${target.id}> foi banido! Motivo: ${reason}`);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao banir usuario!');
        }
    }
    
    if (command === '$kick') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $kick @usuario <motivo>');
            return;
        }
        try {
            await target.kick(reason);
            await safeSendMessage(message.channel, `<@${target.id}> foi expulso! Motivo: ${reason}`);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao expulsar usuario!');
        }
    }
    
    if (command === '$unban') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const userId = args[1];
        if (!userId) {
            await safeSendMessage(message.channel, 'Use: $unban <id>');
            return;
        }
        try {
            await guild.members.unban(userId);
            await safeSendMessage(message.channel, `Usuario ${userId} foi desbanido!`);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao desbanir usuario!');
        }
    }
    
    if (command === '$mute') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $mute @usuario');
            return;
        }
        try {
            const muteRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('mute'));
            if (muteRole) {
                await target.roles.add(muteRole);
                await safeSendMessage(message.channel, `<@${target.id}> foi mutado!`);
            } else {
                await safeSendMessage(message.channel, 'Cargo de mute nao encontrado!');
            }
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao mutar usuario!');
        }
    }
    
    if (command === '$unmute') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.members.first();
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $unmute @usuario');
            return;
        }
        try {
            const muteRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('mute'));
            if (muteRole) {
                await target.roles.remove(muteRole);
                await safeSendMessage(message.channel, `<@${target.id}> foi desmutado!`);
            }
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao desmutar usuario!');
        }
    }
    
    if (command === '$warn') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first();
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        if (!target) {
            await safeSendMessage(message.channel, 'Use: $warn @usuario <motivo>');
            return;
        }
        if (!data.users[target.id]) data.users[target.id] = { warns: [] };
        data.users[target.id].warns.push({ reason, timestamp: Date.now(), by: message.author.id });
        saveData();
        await safeSendMessage(message.channel, `<@${target.id}> recebeu um aviso! Motivo: ${reason}`);
    }
    
    if (command === '$warns') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const target = message.mentions.users.first() || message.author;
        const userData = data.users[target.id] || { warns: [] };
        const warnsList = userData.warns.map((w, i) => `${i + 1}. ${w.reason} - <t:${Math.floor(w.timestamp / 1000)}:d>`).join('\n') || 'Sem avisos';
        const warnsEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle(`Avisos de ${target.tag}`)
            .setDescription(warnsList)
            .setTimestamp();
        await safeSendMessage(message.channel, { embeds: [warnsEmbed] });
    }
    
    if (command === '$clear') {
        if (!isAdmin(member)) {
            await safeSendMessage(message.channel, 'Apenas administradores podem usar este comando!');
            return;
        }
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            await safeSendMessage(message.channel, 'Use: $clear <quantidade> (1-100)');
            return;
        }
        try {
            await message.channel.bulkDelete(amount + 1);
        } catch (e) {
            await safeSendMessage(message.channel, 'Erro ao limpar mensagens!');
        }
    }
});

// Create ticket function
async function createTicket(message, type) {
    const guild = message.guild;
    const user = message.author;
    
    const categoryId = data.settings?.ticketCategory;
    const ticketName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    try {
        const ticketChannel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: categoryId || null,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                }
            ]
        });
        
        // Add staff permissions
        const staffRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('staff'));
        if (staffRole) {
            await ticketChannel.permissionOverwrites.create(staffRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }
        
        data.tickets[ticketChannel.id] = {
            userId: user.id,
            userTag: user.tag,
            type: type,
            claimedBy: null,
            createdAt: Date.now()
        };
        saveData();
        
        // Set channel topic
        await ticketChannel.setTopic(`Ticket de: ${user.tag} | Nao reivindicado`).catch(() => {});
        
        // Send control buttons
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Reivindicar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('unclaim_ticket')
                    .setLabel('Desreivindicar')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Fechar')
                    .setStyle(ButtonStyle.Danger)
            );
        
        // Determine role ping based on ticket type
        let rolePing = '';
        if (type === 'middleman') {
            const middlemanRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('middleman'));
            if (middlemanRole) rolePing = `<@&${middlemanRole.id}>`;
        } else {
            const staffRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('equipe staff') || r.name.toLowerCase().includes('staff'));
            if (staffRole) rolePing = `<@&${staffRole.id}>`;
        }
        
        const ticketEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Ticket ${type === 'middleman' ? 'Middleman' : 'de Suporte'}`)
            .setDescription(`Ola <@${user.id}>!\n\nSeu ticket foi criado. ${rolePing ? `\n\n${rolePing}` : ''}`)
            .addFields(
                { name: 'Tipo', value: type === 'middleman' ? 'Middleman' : 'Suporte', inline: true },
                { name: 'Criado por', value: `<@${user.id}>`, inline: true },
                { name: 'Status', value: 'Nao reivindicado', inline: true }
            )
            .setTimestamp();
        
        await safeSendMessage(ticketChannel, { content: rolePing, embeds: [ticketEmbed], components: [controlRow] });
        await safeSendMessage(message.channel, `Seu ticket foi criado: <#${ticketChannel.id}>`);
        
    } catch (e) {
        console.error('Error creating ticket:', e);
        await safeSendMessage(message.channel, 'Erro ao criar ticket!');
    }
}

// Panel functions
async function sendTicket1Panel(channel) {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Crie seu leilao!')
        .setDescription('Clique no botao abaixo para criar um leilao!')
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_leilao')
                .setLabel('Criar Leilao')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('ð¯')
        );
    
    await safeSendMessage(channel, { embeds: [embed], components: [row] });
}

async function sendTicket2Panel(channel) {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Compre seu cargo!')
        .setDescription('Clique no botao abaixo para comprar um cargo!')
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('buy_role')
                .setLabel('Comprar Cargo')
                .setStyle(ButtonStyle.Success)
                .setEmoji('ð')
        );
    
    await safeSendMessage(channel, { embeds: [embed], components: [row] });
}

async function sendSupportPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Suporte')
        .setDescription('Precisa de ajuda? Clique no botao abaixo para abrir um ticket de suporte!')
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_support')
                .setLabel('Abrir Ticket de Suporte')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('ð«')
        );
    
    await safeSendMessage(channel, { embeds: [embed], components: [row] });
}

async function sendMiddlemanPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor(0xFF00FF)
        .setTitle('Middleman')
        .setDescription('Precisa de um middleman para uma transacao? Clique no botao abaixo!')
        .addFields(
            { name: 'Opcoes', value: 'Trade\nCrosstrade\nVenda/Cripto' }
        )
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('middleman_select')
                .setPlaceholder('Selecione o tipo de transacao')
                .addOptions(
                    { label: 'Trade', value: 'trade', emoji: 'ð±' },
                    { label: 'Crosstrade', value: 'crosstrade', emoji: 'ð' },
                    { label: 'Venda/Cripto', value: 'venda', emoji: 'ð°' }
                )
        );
    
    await safeSendMessage(channel, { embeds: [embed], components: [row] });
}

async function sendVoucherPanel(channel) {
    const config = data.autoVoucherConfig || { senders: [], receivers: [] };
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Painel de Auto-Voucher')
        .setDescription('Configure os usuarios para o sistema automatico de vouchers.')
        .addFields(
            { name: 'Senders', value: config.senders.length > 0 ? `${config.senders.length} configurados` : 'Nenhum', inline: true },
            { name: 'Receivers', value: config.receivers.length > 0 ? `${config.receivers.length} configurados` : 'Nenhum', inline: true },
            { name: 'Comandos', value: '`$addsender <id>` - Adicionar sender\n`$addreceiver <id>` - Adicionar receiver\n`$listsenders` - Listar senders\n`$listreceivers` - Listar receivers' }
        )
        .setTimestamp();
    
    await safeSendMessage(channel, { embeds: [embed] });
}

// Button and select menu interactions
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const { customId, channel, member, guild } = interaction;
        
        if (customId === 'claim_ticket') {
            if (!isStaff(member)) {
                await interaction.reply({ content: 'Apenas staff pode reivindicar!', ephemeral: true });
                return;
            }
            const ticketData = data.tickets[channel.id] || {};
            ticketData.claimedBy = member.id;
            data.tickets[channel.id] = ticketData;
            saveData();
            
            await channel.setTopic(`Ticket de: ${ticketData.userTag} | Reivindicado por: ${member.user.tag}`).catch(() => {});
            await interaction.reply({ content: `Ticket reivindicado por <@${member.id}>!` });
        }
        
        if (customId === 'unclaim_ticket') {
            if (!isStaff(member)) {
                await interaction.reply({ content: 'Apenas staff pode usar!', ephemeral: true });
                return;
            }
            const ticketData = data.tickets[channel.id] || {};
            ticketData.claimedBy = null;
            data.tickets[channel.id] = ticketData;
            saveData();
            
            await channel.setTopic(`Ticket de: ${ticketData.userTag} | Nao reivindicado`).catch(() => {});
            await interaction.reply({ content: 'Ticket desreivindicado!' });
        }
        
        if (customId === 'close_ticket') {
            const transcript = await generateTranscript(channel);
            const transcriptBuffer = Buffer.from(transcript, 'utf8');
            
            const logChannelId = data.settings?.logChannel;
            if (logChannelId) {
                const logChannel = await safeFetchChannel(logChannelId);
                if (logChannel) {
                    const closeEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Ticket Fechado')
                        .addFields(
                            { name: 'Canal', value: channel.name, inline: true },
                            { name: 'Fechado por', value: `<@${member.id}>`, inline: true }
                        )
                        .setTimestamp();
                    await safeSendMessage(logChannel, { 
                        embeds: [closeEmbed],
                        files: [{ attachment: transcriptBuffer, name: `${channel.name}-transcript.txt` }]
                    });
                }
            }
            
            await channel.delete().catch(() => {});
        }
        
        if (customId === 'create_leilao') {
            await interaction.reply({ content: 'Criando ticket de leilao...', ephemeral: true });
            await createTicket({ guild, author: member.user, channel }, 'leilao');
        }
        
        if (customId === 'buy_role') {
            await interaction.reply({ content: 'Criando ticket de compra de cargo...', ephemeral: true });
            await createTicket({ guild, author: member.user, channel }, 'cargo');
        }
        
        if (customId === 'open_support') {
            await interaction.reply({ content: 'Criando ticket de suporte...', ephemeral: true });
            await createTicket({ guild, author: member.user, channel }, 'suporte');
        }
    }
    
    if (interaction.isStringSelectMenu()) {
        const { customId, values, guild, member } = interaction;
        
        if (customId === 'middleman_select') {
            const type = values[0];
            await interaction.reply({ content: `Criando ticket de middleman (${type})...`, ephemeral: true });
            await createTicket({ guild, author: member.user, channel: interaction.channel }, 'middleman');
        }
    }
});

// Extended logging events
client.on('messageDelete', async (message) => {
    if (message.author?.bot) return;
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const deleteEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Mensagem Deletada')
        .addFields(
            { name: 'Autor', value: message.author?.tag || 'Desconhecido', inline: true },
            { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Conteudo', value: message.content?.substring(0, 1000) || 'Sem conteudo' }
        )
        .setTimestamp();
    
    await safeSendMessage(logChannel, { embeds: [deleteEmbed] });
});

client.on('guildMemberAdd', async (member) => {
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const joinEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Usuario Entrou')
        .setDescription(`<@${member.id}> (${member.user.tag}) entrou no servidor!`)
        .setTimestamp();
    
    await safeSendMessage(logChannel, { embeds: [joinEmbed] });
});

client.on('guildMemberRemove', async (member) => {
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const leaveEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Usuario Saiu')
        .setDescription(`<@${member.id}> (${member.user.tag}) saiu do servidor!`)
        .setTimestamp();
    
    await safeSendMessage(logChannel, { embeds: [leaveEmbed] });
});

client.on('guildBanAdd', async (ban) => {
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const banEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Usuario Banido')
        .setDescription(`<@${ban.user.id}> (${ban.user.tag}) foi banido!`)
        .addFields({ name: 'Motivo', value: ban.reason || 'Nao especificado' })
        .setTimestamp();
    
    await safeSendMessage(logChannel, { embeds: [banEmbed] });
});

client.on('guildBanRemove', async (ban) => {
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const unbanEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Usuario Desbanido')
        .setDescription(`<@${ban.user.id}> (${ban.user.tag}) foi desbanido!`)
        .setTimestamp();
    
    await safeSendMessage(logChannel, { embeds: [unbanEmbed] });
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const logChannelId = data.settings?.logChannel;
    if (!logChannelId) return;
    
    const logChannel = await safeFetchChannel(logChannelId);
    if (!logChannel) return;
    
    const oldRoles = oldMember.roles.cache.map(r => r.id);
    const newRoles = newMember.roles.cache.map(r => r.id);
    
    const addedRoles = newRoles.filter(id => !oldRoles.includes(id));
    const removedRoles = oldRoles.filter(id => !newRoles.includes(id));
    
    if (addedRoles.length > 0) {
        const roleEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Cargo Adicionado')
            .setDescription(`<@${newMember.id}> recebeu cargos: ${addedRoles.map(id => `<@&${id}>`).join(', ')}`)
            .setTimestamp();
        await safeSendMessage(logChannel, { embeds: [roleEmbed] });
    }
    
    if (removedRoles.length > 0) {
        const roleEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Cargo Removido')
            .setDescription(`<@${newMember.id}> perdeu cargos: ${removedRoles.map(id => `<@&${id}>`).join(', ')}`)
            .setTimestamp();
        await safeSendMessage(logChannel, { embeds: [roleEmbed] });
    }
});

// Login
client.login(process.env.BOT_TOKEN);
