import { SlashCommandBuilder } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';
import { logAction } from '../utils/logger.js';
import { parsePermissionList } from '../utils/permissions.js';
import { byCsv, findRole } from '../utils/helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management')
    .addSubcommand(s => s.setName('create').setDescription('Create one or many roles')
      .addStringOption(o => o.setName('names').setDescription('Comma separated role names').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color like #ff0000'))
      .addBooleanOption(o => o.setName('hoist').setDescription('Display separately'))
      .addBooleanOption(o => o.setName('mentionable').setDescription('Mentionable'))
      .addStringOption(o => o.setName('permissions').setDescription('Comma separated permissions')))
    .addSubcommand(s => s.setName('delete').setDescription('Delete one or many roles')
      .addStringOption(o => o.setName('roles').setDescription('Role IDs or exact names').setRequired(true)))
    .addSubcommand(s => s.setName('assign').setDescription('Assign one or many roles to one or many users')
      .addStringOption(o => o.setName('roles').setDescription('Role IDs or names').setRequired(true))
      .addStringOption(o => o.setName('users').setDescription('User IDs comma separated').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove one or many roles from one or many users')
      .addStringOption(o => o.setName('roles').setDescription('Role IDs or names').setRequired(true))
      .addStringOption(o => o.setName('users').setDescription('User IDs comma separated').setRequired(true)))
    .addSubcommand(s => s.setName('clone').setDescription('Clone an existing role')
      .addStringOption(o => o.setName('source').setDescription('Source role ID or name').setRequired(true))
      .addStringOption(o => o.setName('new_name').setDescription('New role name').setRequired(true)))
    .addSubcommand(s => s.setName('edit').setDescription('Edit one or many roles')
      .addStringOption(o => o.setName('roles').setDescription('Role IDs or names').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('New shared role name prefix'))
      .addStringOption(o => o.setName('color').setDescription('Hex color'))
      .addBooleanOption(o => o.setName('hoist').setDescription('Display separately'))
      .addBooleanOption(o => o.setName('mentionable').setDescription('Mentionable'))
      .addStringOption(o => o.setName('permissions').setDescription('Comma separated permissions'))),

  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'create') {
      const names = byCsv(interaction.options.getString('names'));
      const color = interaction.options.getString('color') || undefined;
      const hoist = interaction.options.getBoolean('hoist') ?? false;
      const mentionable = interaction.options.getBoolean('mentionable') ?? false;
      const permissions = parsePermissionList(interaction.options.getString('permissions'));
      const made = [];
      for (const name of names) {
        const role = await interaction.guild.roles.create({ name, color, hoist, mentionable, permissions });
        made.push(`${role.name} (${role.id})`);
      }
      await logAction(interaction.guild, { actor: interaction.member, action: 'Role Create', targets: made, details: 'Bulk role creation executed' });
      return interaction.editReply(`✅ Created ${made.length} role(s).\n${made.join('\n')}`);
    }

    if (sub === 'delete') {
      const targets = byCsv(interaction.options.getString('roles')).map(v => findRole(interaction.guild, v)).filter(Boolean);
      const names = [];
      for (const role of targets) {
        names.push(`${role.name} (${role.id})`);
        await role.delete('Deleted via Safal Assistance');
      }
      await logAction(interaction.guild, { actor: interaction.member, action: 'Role Delete', targets: names, details: 'Bulk delete executed' });
      return interaction.editReply(`🗑️ Deleted ${names.length} role(s).`);
    }

    if (sub === 'assign' || sub === 'remove') {
      const roles = byCsv(interaction.options.getString('roles')).map(v => findRole(interaction.guild, v)).filter(Boolean);
      const users = byCsv(interaction.options.getString('users'));
      const touched = [];
      for (const uid of users) {
        const member = await interaction.guild.members.fetch(uid).catch(() => null);
        if (!member) continue;
        for (const role of roles) {
          if (sub === 'assign') await member.roles.add(role);
          else await member.roles.remove(role);
          touched.push(`${member.user.tag} -> ${role.name}`);
        }
      }
      await logAction(interaction.guild, { actor: interaction.member, action: `Role ${sub === 'assign' ? 'Assign' : 'Remove'}`, targets: touched, details: 'Multi-user role operation executed' });
      return interaction.editReply(`✅ ${sub === 'assign' ? 'Assigned' : 'Removed'} roles for ${users.length} user(s).`);
    }

    if (sub === 'clone') {
      const source = findRole(interaction.guild, interaction.options.getString('source'));
      if (!source) return interaction.editReply('❌ Source role not found.');
      const newName = interaction.options.getString('new_name');
      const role = await interaction.guild.roles.create({
        name: newName,
        color: source.color,
        hoist: source.hoist,
        mentionable: source.mentionable,
        permissions: source.permissions.bitfield,
      });
      await logAction(interaction.guild, { actor: interaction.member, action: 'Role Clone', targets: [`${source.name} -> ${role.name}`], details: `Cloned ${source.id} into ${role.id}` });
      return interaction.editReply(`✅ Cloned role into **${role.name}**.`);
    }

    if (sub === 'edit') {
      const roles = byCsv(interaction.options.getString('roles')).map(v => findRole(interaction.guild, v)).filter(Boolean);
      const name = interaction.options.getString('name');
      const color = interaction.options.getString('color');
      const hoist = interaction.options.getBoolean('hoist');
      const mentionable = interaction.options.getBoolean('mentionable');
      const permissionsRaw = interaction.options.getString('permissions');
      const touched = [];
      let index = 1;

      for (const role of roles) {
        await role.edit({
          name: name ? `${name}${roles.length > 1 ? `-${index}` : ''}` : role.name,
          color: color ?? role.color,
          hoist: hoist ?? role.hoist,
          mentionable: mentionable ?? role.mentionable,
          permissions: permissionsRaw ? parsePermissionList(permissionsRaw) : role.permissions.bitfield,
        });
        touched.push(`${role.name} (${role.id})`);
        index++;
      }

      await logAction(interaction.guild, { actor: interaction.member, action: 'Role Edit', targets: touched, details: 'Bulk role edit executed' });
      return interaction.editReply(`✅ Edited ${touched.length} role(s).`);
    }
  },
};