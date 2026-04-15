import { PermissionFlagsBits } from 'discord.js';

export const permissionMap = {
  view: PermissionFlagsBits.ViewChannel,
  send: PermissionFlagsBits.SendMessages,
  read_history: PermissionFlagsBits.ReadMessageHistory,
  manage_messages: PermissionFlagsBits.ManageMessages,
  manage_channels: PermissionFlagsBits.ManageChannels,
  manage_roles: PermissionFlagsBits.ManageRoles,
  connect: PermissionFlagsBits.Connect,
  speak: PermissionFlagsBits.Speak,
  embed_links: PermissionFlagsBits.EmbedLinks,
  attach_files: PermissionFlagsBits.AttachFiles,
  add_reactions: PermissionFlagsBits.AddReactions,
  use_slash_commands: PermissionFlagsBits.UseApplicationCommands,
  mention_everyone: PermissionFlagsBits.MentionEveryone,
  kick_members: PermissionFlagsBits.KickMembers,
  ban_members: PermissionFlagsBits.BanMembers,
  administrator: PermissionFlagsBits.Administrator,
};

export function parsePermissionList(input) {
  if (!input) return 0n;
  return input.split(',').map(v => v.trim().toLowerCase()).reduce((acc, key) => {
    return permissionMap[key] ? acc | permissionMap[key] : acc;
  }, 0n);
}

export function buildOverwrite(allowList = '', denyList = '') {
  return {
    allow: parsePermissionList(allowList),
    deny: parsePermissionList(denyList),
  };
}