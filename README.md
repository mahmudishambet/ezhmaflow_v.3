# Ezhma Studio Manager

Live streaming management application built with Node.js and FFmpeg.

## Features

- 📺 Multi-platform live streaming (YouTube, Facebook, Custom RTMP)
- 📁 Video gallery with folder management
- 🎵 Playlist support with audio overlay
- 📅 Stream scheduling & auto-stop
- 🔄 Stream rotation
- 📱 Responsive dashboard
- 📲 Telegram notifications (start/stop/error)
- 🔐 User authentication with reCAPTCHA support

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the application
npm run dev
```

## Environment Variables

```
PORT=7575
SESSION_SECRET=your-secret-key
NODE_ENV=production
```

## Telegram Notifications

Configure Telegram notifications in Settings > Integration:
1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your Chat ID via [@userinfobot](https://t.me/userinfobot)
3. Enter Bot Token and Chat ID in settings
4. Enable notifications

## Tech Stack

- **Backend**: Node.js, Express
- **Video**: FFmpeg
- **Database**: SQLite3
- **Template**: EJS
- **Frontend**: TailwindCSS, Tabler Icons

## License

MIT License
