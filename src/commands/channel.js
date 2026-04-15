import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';
import { logAction } from '../utils/logger.js';
import { byCsv, findChannel } from '../utils/helpers.js';

const typeMap = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
  stage: ChannelType.GuildStageVoice,
};

export default {
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Channel management')
    .addSubcommand(s => s.setName('create').setDescription('Create one or many channels')
      .addStringOption(o => o.setName('names').setDescription('Comma separated names').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('text,voice,announcement,forum,stage').setRequired(true))
      .addStringOption(o => o.setName('category').setDescription('Parent category ID or exact name'))
      .addStringOption(o => o.setName('topic').setDescription('Topic'))
      .addIntegerOption(o => o.setName('slowmode').setDescription('Slowmode seconds'))
      .addBooleanOption(o => o.setName('nsfw').setDescription('NSFW')))
    .addSubcommand(s => s.setName('rename').setDescription('Rename one or many channels')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('new_name').setDescription('Base new name').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete one or many channels')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true)))
    .addSubcommand(s => s.setName('duplicate').setDescription('Duplicate a channel')
      .addStringOption(o => o.setName('source').setDescription('Channel ID or name').setRequired(true))
      .addStringOption(o => o.setName('new_name').setDescription('New channel name').setRequired(true)))
    .addSubcommand(s => s.setName('move').setDescription('Move one or many channels to a category')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('category').setDescription('Category ID or name').setRequired(true)))
    .addSubcommand(s => s.setName('bulk-settings').setDescription('Apply topic/slowmode/nsfw to many channels')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('topic').setDescription('Topic'))
      .addIntegerOption(o => o.setName('slowmode').setDescription('Slowmode'))
      .addBooleanOption(o => o.setName('nsfw').setDescription('NSFW'))),

  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'create') {
      const names = byCsv(interaction.options.getString('names'));
      const type = typeMap[interaction.options.getString('type')];
      const categoryRaw = interaction.options.getString('category');
      const parent = categoryRaw ? findChannel(interaction.guild, categoryRaw) : null;
      const topic = interaction.options.getString('topic') || undefined;
      const slowmode = interaction.options.getInteger('slowmode') ?? undefined;
      const nsfw = interaction.options.getBoolean('nsfw') ?? false;
      const made = [];

      for (const name of names) {
        const channel = await interaction.guild.channels.create({
          name,
          type,
          parent: parent?.id,
          topic,
          rateLimitPerUser: slowmode,
          nsfw,
        });
        made.push(`${channel.name} (${channel.id})`);
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Create', targets: made, details: 'Bulk channel create executed' });
      return interaction.editReply(`✅ Created ${made.length} channel(s).`);
    }

    if (sub === 'rename') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const base = interaction.options.getString('new_name');
      const touched = [];
      let i = 1;

      for (const channel of channels) {
        await channel.edit({ name: channels.length > 1 ? `${base}-${i}` : base });
        touched.push(`${channel.name} (${channel.id})`);
        i++;
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Rename', targets: touched, details: 'Bulk rename executed' });
      return interaction.editReply(`✅ Renamed ${touched.length} channel(s).`);
    }

    if (sub === 'delete') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const touched = channels.map(c => `${c.name} (${c.id})`);
      for (const channel of channels) await channel.delete('Deleted via Safal Assistance');
      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Delete', targets: touched, details: 'Bulk delete executed' });
      return interaction.editReply(`🗑️ Deleted ${touched.length} channel(s).`);
    }

    if (sub === 'duplicate') {
      const source = findChannel(interaction.guild, interaction.options.getString('source'));
      if (!source) return interaction.editReply('❌ Source channel not found.');
      const copy = await source.clone({ name: interaction.options.getString('new_name') });
      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Duplicate', targets: [`${source.name} -> ${copy.name}`], details: 'Channel cloned with settings' });
      return interaction.editReply(`✅ Duplicated channel to **${copy.name}**.`);
    }

    if (sub === 'move') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const parent = findChannel(interaction.guild, interaction.options.getString('category'));
      if (!parent) return interaction.editReply('❌ Category not found.');
      for (const channel of channels) await channel.setParent(parent.id, { lockPermissions: false });
      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Move', targets: channels.map(c => `${c.name} -> ${parent.name}`), details: 'Bulk move executed' });
      return interaction.editReply(`✅ Moved ${channels.length} channel(s) into **${parent.name}**.`);
    }

    if (sub === 'bulk-settings') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const topic = interaction.options.getString('topic');
      const slowmode = interaction.options.getInteger('slowmode');
      const nsfw = interaction.options.getBoolean('nsfw');

      for (const channel of channels) {
        await channel.edit({
          topic: topic ?? channel.topic,
          rateLimitPerUser: slowmode ?? channel.rateLimitPerUser,
          nsfw: nsfw ?? channel.nsfw,
        });
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Channel Bulk Settings', targets: channels.map(c => `${c.name} (${c.id})`), details: `topic=${topic ?? 'keep'}, slowmode=${slowmode ?? 'keep'}, nsfw=${nsfw ?? 'keep'}` });
      return interaction.editReply(`✅ Updated ${channels.length} channel(s).`);
    }
  },
};