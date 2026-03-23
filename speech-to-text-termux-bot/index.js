const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

const WhatsAppHandler = require('./whatsapp');
const SpeechToText = require('./speech');
const recorder = require('./recorder');
const appLauncher = require('./appLauncher');

const STATE = {
    IDLE: 'idle',
    WAITING_FOR_RECORDING: 'waiting_for_recording',
    TRANSCRIBING: 'transcribing',
    WAITING_FOR_RECIPIENT: 'waiting_for_recipient',
    SENDING: 'sending'
};

class Bot {
    constructor() {
        this.state = STATE.IDLE;
        this.currentMessage = '';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.whatsapp = new WhatsAppHandler(this.rl);
        this.speech = new SpeechToText(process.env.ASSEMBLYAI_API_KEY || '');
    }

    async start() {
        console.log('\n========================================');
        console.log('🎙️  Speech-to-Text WhatsApp Bot for Termux');
        console.log('========================================\n');

        if (!process.env.ASSEMBLYAI_API_KEY) {
            console.log('⚠️  WARNING: ASSEMBLYAI_API_KEY not set in .env');
            console.log('   Speech-to-text will not work!\n');
        }

        console.log('Connecting to WhatsApp...');
        await this.whatsapp.initialize();

        this.showHelp();
        this.listen();
    }

    showHelp() {
        console.log('\n📖 Available Commands:');
        console.log('   hi           - Record a voice message');
        console.log('   youtube      - Open YouTube');
        console.log('   music        - Open YouTube Music');
        console.log('   spotify      - Open Spotify');
        console.log('   settings     - Open Android Settings');
        console.log('   chrome       - Open Chrome');
        console.log('   help         - Show this help');
        console.log('   exit         - Exit the bot\n');
    }

    listen() {
        this.rl.question('', async (input) => {
            const command = input.trim().toLowerCase();
            
            if (this.state === STATE.WAITING_FOR_RECIPIENT) {
                if (command === 'cancel' || command === 'c') {
                    console.log('❎ Message cancelled.');
                    this.state = STATE.IDLE;
                    this.currentMessage = '';
                    this.listen();
                } else {
                    await this.sendMessageToRecipient(command);
                    if (this.state === STATE.IDLE) {
                        this.listen();
                    }
                }
            } else if (command === 'exit') {
                console.log('👋 Goodbye!');
                await this.whatsapp.disconnect();
                process.exit(0);
            } else if (command === 'help') {
                this.showHelp();
            } else if (command === 'hi') {
                await this.handleVoiceMessage();
            } else if (['youtube', 'music', 'spotify', 'settings', 'chrome', 'whatsapp', 'files'].includes(command)) {
                await this.handleOpenApp(command);
            } else if (command === 'test') {
                await this.handleTest();
            } else {
                console.log('❓ Unknown command. Type "help" for available commands.');
            }
            
            if (this.state === STATE.IDLE) {
                this.listen();
            }
        });
    }

    async handleTest() {
        console.log('🧪 Testing components...');
        
        try {
            const recordingAvailable = await recorder.isRecordingAvailable();
            console.log(`   Recording: ${recordingAvailable ? '✅' : '❌'}`);
            
            if (!recordingAvailable) {
                console.log('   ⚠️ Install termux-api: pkg install termux-api');
            }
            
            console.log(`   WhatsApp: ${this.whatsapp.isReady() ? '✅' : '❌'}`);
            console.log(`   AssemblyAI: ${process.env.ASSEMBLYAI_API_KEY ? '✅ (configured)' : '❌ (not set)'}`);
            
            appLauncher.listApps();
        } catch (error) {
            console.error('Test error:', error);
        }
    }

    async handleVoiceMessage() {
        if (this.state !== STATE.IDLE) {
            console.log('⚠️  Please complete current operation first');
            return;
        }

        console.log('\n🎤 Recording mode activated!');
        console.log('   Speak your message... (max 30 seconds)');
        console.log('   Recording will start in 2 seconds...');

        await this.delay(2000);
        
        try {
            const audioPath = await recorder.recordAudio(30);
            
            this.state = STATE.TRANSCRIBING;
            console.log('\n🔄 Processing your voice message...');
            
            const text = await this.speech.transcribe(audioPath);
            
            this.currentMessage = text;
            this.state = STATE.WAITING_FOR_RECIPIENT;
            
            console.log('\n📝 Your message:');
            console.log(`   "${text}"\n`);
            
            console.log('📱 Enter recipient phone number (with country code, e.g., 919876543210):');
            
        } catch (error) {
            console.error('❌ Error processing voice message:', error.message);
            this.state = STATE.IDLE;
        }
    }

    async handleOpenApp(appName) {
        try {
            console.log(`\n📱 Opening ${appName}...`);
            await appLauncher.openApp(appName);
        } catch (error) {
            console.error(`❌ Failed to open ${appName}:`, error.message);
        }
    }

    async sendMessageToRecipient(phoneNumber) {
        if (this.state !== STATE.WAITING_FOR_RECIPIENT) {
            console.log('⚠️  No message to send. Type "hi" to record.');
            return;
        }

        if (!phoneNumber || !/^\d{11,15}$/.test(phoneNumber.replace(/[^0-9]/g, ''))) {
            console.log('❌ Invalid phone number. Try again.');
            return;
        }

        this.state = STATE.SENDING;

        try {
            await this.whatsapp.sendMessage(phoneNumber, this.currentMessage);
            console.log(`✅ Message sent to ${phoneNumber}`);
            console.log(`   Message: "${this.currentMessage}"`);
        } catch (error) {
            console.error('❌ Failed to send message:', error.message);
        }

        this.state = STATE.IDLE;
        this.currentMessage = '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const bot = new Bot();

process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...');
    await bot.whatsapp.disconnect();
    process.exit(0);
});

bot.start().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
