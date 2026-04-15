import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

export async function logAction(guild, { actor, action, targets = [], details = '' }) {
  const channel = guild.channels.cache.find(c => c.name === config.modLogChannel && c.isTextBased());
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`Audit Log: ${action}`)
    .setColor(0x5865F2)
    .setTimestamp(new Date())
    .addFields(
      { name: 'Triggered By', value: actor?.user?.tag || actor?.tag || 'Unknown', inline: false },
      { name: 'Affected Items', value: targets.length ? targets.join('\n').slice(0, 1024) : 'None', inline: false },
      { name: 'Details', value: details || 'No extra details', inline: false }
    );

  await channel.send({ embeds: [embed] }).catch(() => null);
}