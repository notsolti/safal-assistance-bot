import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';
import { logAction } from '../utils/logger.js';
import { byCsv, findChannel } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('category')
    .setDescription('Category management')
    .addSubcommand(s => s.setName('create').setDescription('Create category').addStringOption(o => o.setName('name').setDescription('Category name').setRequired(true)))
    .addSubcommand(s => s.setName('rename').setDescription('Rename category').addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true)).addStringOption(o => o.setName('new_name').setDescription('New name').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete category').addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true)))
    .addSubcommand(s => s.setName('move_channels').setDescription('Move many channels into a category')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true)))
    .addSubcommand(s => s.setName('sync').setDescription('Sync all child channels with category permissions')
      .addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true)))
    .addSubcommand(s => s.setName('lock').setDescription('Lock category to read-only')
      .addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true)))
    .addSubcommand(s => s.setName('unlock').setDescription('Unlock category')
      .addStringOption(o => o.setName('category').setDescription('ID or name').setRequired(true))),

  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'create') {
      const category = await interaction.guild.channels.create({ name: interaction.options.getString('name'), type: ChannelType.GuildCategory });
      await logAction(interaction.guild, { actor: interaction.member, action: 'Category Create', targets: [`${category.name} (${category.id})`], details: 'Category created' });
      return interaction.editReply(`✅ Created category **${category.name}**.`);
    }

    const category = findChannel(interaction.guild, interaction.options.getString('category'));
    if (!category) return interaction.editReply('❌ Category not found.');

    if (sub === 'rename') {
      await category.edit({ name: interaction.options.getString('new_name') });
      await logAction(interaction.guild, { actor: interaction.member, action: 'Category Rename', targets: [`${category.name} (${category.id})`], details: 'Category renamed' });
      return interaction.editReply('✅ Category renamed.');
    }

    if (sub === 'delete') {
      const name = `${category.name} (${category.id})`;
      await category.delete('Deleted via Safal Assistance');
      await logAction(interaction.guild, { actor: interaction.member, action: 'Category Delete', targets: [name], details: 'Category deleted' });
      return interaction.editReply('🗑️ Category deleted.');
    }

    if (sub === 'move_channels') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      for (const channel of channels) await channel.setParent(category.id);
      await logAction(interaction.guild, { actor: interaction.member, action: 'Category Move Channels', targets: channels.map(c => `${c.name} -> ${category.name}`), details: 'Bulk category move executed' });
      return interaction.editReply(`✅ Moved ${channels.length} channel(s).`);
    }

    if (sub === 'sync') {
      const children = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
      for (const child of children.values()) await child.lockPermissions();
      await logAction(interaction.guild, { actor: interaction.member, action: 'Category Sync', targets: children.map(c => `${c.name} (${c.id})`), details: `Synced children with ${category.name}` });
      return interaction.editReply(`✅ Synced ${children.size} child channel(s).`);
    }

    if (sub === 'lock' || sub === 'unlock') {
      const everyone = interaction.guild.roles.everyone;
      const locked = sub === 'lock';

      await category.permissionOverwrites.edit(everyone, {
        SendMessages: locked ? false : null,
        AddReactions: locked ? false : null,
        Speak: locked ? false : null,
      });

      const children = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
      for (const child of children.values()) {
        await child.permissionOverwrites.edit(everyone, {
          SendMessages: locked ? false : null,
          AddReactions: locked ? false : null,
          Speak: locked ? false : null,
        });
      }

      await logAction(interaction.guild, { actor: interaction.member, action: `Category ${locked ? 'Lock' : 'Unlock'}`, targets: [`${category.name} (${category.id})`, ...children.map(c => `${c.name} (${c.id})`)], details: `Category ${locked ? 'locked' : 'unlocked'} in one action` });
      return interaction.editReply(`✅ Category ${locked ? 'locked' : 'unlocked'}.`);
    }
  },
};