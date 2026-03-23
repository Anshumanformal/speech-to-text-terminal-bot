# Speech-to-Text WhatsApp Bot for Termux

A Node.js bot for Termux that converts speech to text and sends messages via WhatsApp. Also includes app launching functionality.

## Features

- 🎙️ **Speech-to-Text**: Record voice messages and convert to text using AssemblyAI
- 📱 **WhatsApp Messaging**: Send text messages via WhatsApp using Baileys
- 🚀 **App Launcher**: Open YouTube, YouTube Music, Spotify, Settings, Chrome, and more
- 🔒 **100% Free Tools**: All components are free (local tools + free tiers)

## Prerequisites

### Termux Packages
```bash
pkg update && pkg upgrade
pkg install git nodejs ffmpeg termux-api
```

### Node.js Dependencies
```bash
cd speech-to-text-termux-bot
npm install
```

## Installation

1. **Clone and Setup**
   ```bash
   git clone <repo-url>
   cd speech-to-text-termux-bot
   npm install
   ```

2. **Configure AssemblyAI**
   - Sign up at https://www.assemblyai.com/
   - Get your free API key (10 hours/month free)
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your API key:
     ```
     ASSEMBLYAI_API_KEY=your_actual_api_key_here
     ```

3. **Connect WhatsApp**
   ```bash
   npm start
   ```
   - Scan the QR code with your WhatsApp
   - Wait for "WhatsApp connected successfully!"

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `hi` | Record a voice message |
| `youtube` | Open YouTube app |
| `music` | Open YouTube Music |
| `spotify` | Open Spotify |
| `settings` | Open Android Settings |
| `chrome` | Open Chrome |
| `help` | Show available commands |
| `exit` | Exit the bot |

### Sending a WhatsApp Message

1. Type `hi` and press Enter
2. Speak your message within 30 seconds
3. Wait for transcription to complete
4. Enter recipient's phone number (with country code, e.g., `919876543210`)
5. Message is sent!

### Opening Apps

Simply type the app name:
```
youtube
music  
spotify
settings
chrome
```

## Project Structure

```
speech-to-text-termux-bot/
├── index.js          # Main bot (input listener)
├── whatsapp.js       # Baileys WhatsApp handler
├── speech.js         # Speech-to-text (AssemblyAI)
├── recorder.js       # Audio recording (Termux API)
├── appLauncher.js    # Open YouTube/Spotify/etc
├── package.json      # Dependencies
├── .env.example     # Environment template
└── README.md         # This file
```

## Troubleshooting

### Recording not working
```bash
pkg install termux-api
```

### WhatsApp not connecting
- Make sure your phone has internet connection
- Try deleting `auth_info` folder and re-scanning QR code

### AssemblyAI transcription fails
- Check your API key in `.env` file
- Verify you have free credits remaining

### App not opening
- Some apps may have different package/activity names on your device
- Check installed apps with: `pm list packages`

## License

MIT
