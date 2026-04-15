import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Ping test'),
  async execute(interaction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  },
};