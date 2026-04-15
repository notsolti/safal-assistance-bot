import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { requireManagerAccess } from '../utils/auth.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Prepare the mod logs channel if missing')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!await requireManagerAccess(interaction)) return;
    const existing = interaction.guild.channels.cache.find(c => c.name === 'mod-logs');
    if (existing) return interaction.reply({ content: '✅ #mod-logs already exists.', ephemeral: true });
    const channel = await interaction.guild.channels.create({ name: 'mod-logs' });
    await interaction.reply({ content: `✅ Created ${channel}.`, ephemeral: true });
  },
};