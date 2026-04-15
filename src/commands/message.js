import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';
import { logAction } from '../utils/logger.js';
import { byCsv, findChannel } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Message management')
    .addSubcommand(s => s.setName('send').setDescription('Send message to one or many channels')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('content').setDescription('Message content').setRequired(true)))
    .addSubcommand(s => s.setName('embed').setDescription('Send embed to one or many channels')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color')))
    .addSubcommand(s => s.setName('edit').setDescription('Edit a message sent by the bot')
      .addStringOption(o => o.setName('channel').setDescription('Channel ID or name').setRequired(true))
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('content').setDescription('New content').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete one message')
      .addStringOption(o => o.setName('channel').setDescription('Channel ID or name').setRequired(true))
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(s => s.setName('pin').setDescription('Pin or unpin message')
      .addStringOption(o => o.setName('channel').setDescription('Channel ID or name').setRequired(true))
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addBooleanOption(o => o.setName('state').setDescription('true=pin false=unpin').setRequired(true))),

  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'send') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const content = interaction.options.getString('content');
      const sent = [];

      for (const channel of channels) {
        const msg = await channel.send({ content });
        sent.push(`${channel.name}: ${msg.id}`);
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Message Send', targets: sent, details: content.slice(0, 500) });
      return interaction.editReply(`✅ Sent message to ${sent.length} channel(s).`);
    }

    if (sub === 'embed') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const embed = new EmbedBuilder()
        .setTitle(interaction.options.getString('title'))
        .setDescription(interaction.options.getString('description'))
        .setColor(interaction.options.getString('color') || '#5865F2')
        .setFooter({ text: 'Sent by Safal Assistance' })
        .setTimestamp();

      const sent = [];
      for (const channel of channels) {
        const msg = await channel.send({ embeds: [embed] });
        sent.push(`${channel.name}: ${msg.id}`);
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Message Embed Send', targets: sent, details: embed.data.title || 'Embed sent' });
      return interaction.editReply(`✅ Sent embed to ${sent.length} channel(s).`);
    }

    const channel = findChannel(interaction.guild, interaction.options.getString('channel'));
    if (!channel) return interaction.editReply('❌ Channel not found.');
    const msg = await channel.messages.fetch(interaction.options.getString('message_id')).catch(() => null);
    if (!msg) return interaction.editReply('❌ Message not found.');

    if (sub === 'edit') {
      await msg.edit(interaction.options.getString('content'));
      await logAction(interaction.guild, { actor: interaction.member, action: 'Message Edit', targets: [`${channel.name}: ${msg.id}`], details: 'Message content replaced' });
      return interaction.editReply('✅ Message updated.');
    }

    if (sub === 'delete') {
      await msg.delete();
      await logAction(interaction.guild, { actor: interaction.member, action: 'Message Delete', targets: [`${channel.name}: ${interaction.options.getString('message_id')}`], details: 'Message deleted' });
      return interaction.editReply('🗑️ Message deleted.');
    }

    if (sub === 'pin') {
      const state = interaction.options.getBoolean('state');
      if (state) await msg.pin();
      else await msg.unpin();
      await logAction(interaction.guild, { actor: interaction.member, action: state ? 'Message Pin' : 'Message Unpin', targets: [`${channel.name}: ${msg.id}`], details: `Pinned=${state}` });
      return interaction.editReply(`✅ Message ${state ? 'pinned' : 'unpinned'}.`);
    }
  },
};