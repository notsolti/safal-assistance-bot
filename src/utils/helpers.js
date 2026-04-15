export function byCsv(value) {
  return (value || '').split(',').map(v => v.trim()).filter(Boolean);
}

export function findRole(guild, raw) {
  return guild.roles.cache.get(raw) || guild.roles.cache.find(r => r.name === raw);
}

export function findChannel(guild, raw) {
  return guild.channels.cache.get(raw) || guild.channels.cache.find(c => c.name === raw);
}