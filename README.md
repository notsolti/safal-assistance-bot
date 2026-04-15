# Safal Assistance Bot

A working Discord.js v14 management bot for:
- Roles
- Channels
- Categories
- Permissions
- Messages
- Audit logs
- Admin-only control

## Setup

1. Install Node.js 20+
2. Create `.env` from `.env.example`
3. Run `npm install`
4. Run `npm run deploy`
5. Run `npm start`

## Required bot permissions
- Manage Roles
- Manage Channels
- Manage Messages
- View Channels
- Send Messages
- Read Message History
- Use Application Commands
- Embed Links

## Notes
- Authorized role names are controlled from `.env`
- Logs are sent to `#mod-logs`
- This is a real working base, but some advanced parts from your full spec like full drag reorder lists, dashboard endpoint, preset template storage, and cross-channel bulk pin arrays still need phase 2 expansion