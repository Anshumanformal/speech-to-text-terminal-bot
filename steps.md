# Mobile Setup Instructions

## Part 1: Push to GitHub (On Laptop with VSCode)

1. Open terminal in VSCode
2. Initialize git (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Speech-to-Text WhatsApp Bot"
   ```
3. Create GitHub repo and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/speech-to-text-termux-bot.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Setup on Mobile (Termux)

### Step 1: Install Termux Packages
Open Termux and run:
```bash
pkg update && pkg upgrade
pkg install git nodejs ffmpeg termux-api
```

### Step 2: Clone from GitHub
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/speech-to-text-termux-bot.git
cd speech-to-text-termux-bot
```

### Step 3: Install Node Dependencies
```bash
npm install
```

### Step 4: Configure AssemblyAI
1. Sign up at https://www.assemblyai.com/
2. Copy your API key from the dashboard
3. Create .env file:
   ```bash
   cp .env.example .env
   nano .env
   ```
4. Replace `your_api_key_here` with your actual API key
5. Save: Ctrl+O, then Ctrl+X

### Step 5: Run the Bot
```bash
npm start
```

### Step 6: Connect WhatsApp
- Scan the QR code with WhatsApp (Linked Devices)
- Wait for "WhatsApp connected successfully!"

---

## Bot Commands
| Command | Action |
|---------|--------|
| `hi` | Record voice → send via WhatsApp |
| `youtube` | Open YouTube |
| `music` | Open YouTube Music |
| `spotify` | Open Spotify |
| `settings` | Open Android Settings |
| `help` | Show help |
| `exit` | Exit bot |

---

## Troubleshooting

### Recording not working
```bash
pkg install termux-api
```

### WhatsApp not connecting
Delete auth folder and re-scan:
```bash
rm -rf auth_info
npm start
```

### App not opening
Check your app package names:
```bash
pm list packages
```
