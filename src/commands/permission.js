import { SlashCommandBuilder } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';
import { logAction } from '../utils/logger.js';
import { buildOverwrite } from '../utils/permissions.js';
import { byCsv, findChannel, findRole } from '../utils/helpers.js';

function resolveTarget(guild, raw) {
  const role = findRole(guild, raw);
  if (role) return role;
  return guild.members.cache.get(raw) || null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('permission')
    .setDescription('Permission overwrite management')
    .addSubcommand(s => s.setName('set').setDescription('Apply overwrite to one or many channels/categories')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('target').setDescription('Role ID/name or user ID').setRequired(true))
      .addStringOption(o => o.setName('allow').setDescription('Comma separated allow list'))
      .addStringOption(o => o.setName('deny').setDescription('Comma separated deny list')))
    .addSubcommand(s => s.setName('clear').setDescription('Clear overwrites from one or many channels/categories')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true)))
    .addSubcommand(s => s.setName('private').setDescription('Make channels private and whitelist roles')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('roles').setDescription('Whitelisted roles').setRequired(true)))
    .addSubcommand(s => s.setName('readonly').setDescription('Make channels read only except staff roles')
      .addStringOption(o => o.setName('channels').setDescription('IDs or names').setRequired(true))
      .addStringOption(o => o.setName('staff_roles').setDescription('Staff roles').setRequired(true))),

  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'set') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const target = resolveTarget(interaction.guild, interaction.options.getString('target'));
      if (!target) return interaction.editReply('❌ Target role/user not found.');
      const overwrite = buildOverwrite(interaction.options.getString('allow'), interaction.options.getString('deny'));

      for (const channel of channels) await channel.permissionOverwrites.edit(target.id, overwrite);

      await logAction(interaction.guild, { actor: interaction.member, action: 'Permission Set', targets: channels.map(c => `${c.name} (${c.id})`), details: `Target=${target.id}, allow=${interaction.options.getString('allow') || '-'}, deny=${interaction.options.getString('deny') || '-'}` });
      return interaction.editReply(`✅ Applied overwrites to ${channels.length} channel(s).`);
    }

    if (sub === 'clear') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);

      for (const channel of channels) {
        for (const overwrite of channel.permissionOverwrites.cache.values()) {
          await channel.permissionOverwrites.delete(overwrite.id).catch(() => null);
        }
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Permission Clear', targets: channels.map(c => `${c.name} (${c.id})`), details: 'All overwrites removed' });
      return interaction.editReply(`✅ Cleared overwrites from ${channels.length} channel(s).`);
    }

    if (sub === 'private') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const roles = byCsv(interaction.options.getString('roles')).map(v => findRole(interaction.guild, v)).filter(Boolean);

      for (const channel of channels) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
        for (const role of roles) await channel.permissionOverwrites.edit(role.id, { ViewChannel: true });
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Permission Private', targets: channels.map(c => `${c.name} (${c.id})`), details: `Whitelisted roles: ${roles.map(r => r.name).join(', ')}` });
      return interaction.editReply(`✅ Made ${channels.length} channel(s) private.`);
    }

    if (sub === 'readonly') {
      const channels = byCsv(interaction.options.getString('channels')).map(v => findChannel(interaction.guild, v)).filter(Boolean);
      const staffRoles = byCsv(interaction.options.getString('staff_roles')).map(v => findRole(interaction.guild, v)).filter(Boolean);

      for (const channel of channels) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false, AddReactions: false });
        for (const role of staffRoles) await channel.permissionOverwrites.edit(role.id, { SendMessages: true, AddReactions: true, ManageMessages: true });
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Permission Readonly', targets: channels.map(c => `${c.name} (${c.id})`), details: `Staff roles: ${staffRoles.map(r => r.name).join(', ')}` });
      return interaction.editReply(`✅ Made ${channels.length} channel(s) read-only.`);
    }
  },
};