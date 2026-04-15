import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  modLogChannel: process.env.MOD_LOG_CHANNEL || 'mod-logs',
  authorizedRoles: (process.env.AUTHORIZED_ROLES || 'Owner,Admin,Moderator')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean),
};