import { config } from '../config.js';

export function hasManagerAccess(member) {
  if (!member) return false;
  if (member.guild.ownerId === member.id) return true;
  return member.roles.cache.some(role => config.authorizedRoles.includes(role.name));
}

export async function requireManagerAccess(interaction) {
  if (hasManagerAccess(interaction.member)) return true;
  const payload = { content: '❌ You are not allowed to use this command.', ephemeral: true };
  if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
  else await interaction.reply(payload);
  return false;
}