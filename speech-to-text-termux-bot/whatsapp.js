const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const fs = require('fs');

const SESSION_DIR = './auth_info';

class WhatsAppHandler {
    constructor(rl) {
        this.socket = null;
        this.isConnected = false;
        this.rl = rl;
    }

    async initialize() {
        console.log('📱 Initializing WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        console.log('[DEBUG] Creating WhatsApp socket...');
        
        this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['TermuxBot', 'Chrome', '120.0'],
            version: [2, 3000, 1034074495]
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('[DEBUG] Connection update:', {
                connection,
                lastDisconnect: lastDisconnect?.error || 'none',
                qr: qr ? 'present' : 'none'
            });
            
            if (connection === 'connecting') {
                console.log('🔄 Connecting to WhatsApp...');
            } else if (connection === 'close') {
                const reason = DisconnectReason[lastDisconnect?.error] || lastDisconnect?.error;
                console.log('❌ Connection closed:', reason);
                console.log('[DEBUG] Last disconnect details:', lastDisconnect);
                this.isConnected = false;
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');
                this.isConnected = true;
            } else if (connection === 'banner') {
                console.log('[DEBUG] Received banner:', update);
            }
        });

        console.log('[DEBUG] Waiting for socket to initialize...');
        await this.delay(2000);
        await this.requestPairingCode();
        await this.waitForConnectionWithRetry();
    }

    async waitForConnectionWithRetry(maxRetries = 3) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                console.log(`[DEBUG] Attempting connection (${retries + 1}/${maxRetries})...`);
                await this.waitForConnection();
                console.log('[DEBUG] Connection successful!');
                return;
            } catch (error) {
                retries++;
                console.log(`[DEBUG] Connection attempt ${retries} failed:`, error.message);
                
                if (retries < maxRetries) {
                    console.log(`🔄 Retrying in 3 seconds... (${retries}/${maxRetries})`);
                    await this.delay(3000);
                } else {
                    console.log('❌ All connection attempts failed.');
                    console.log('[DEBUG] Asking user to retry manually...');
                    
                    return new Promise((resolve) => {
                        this.rl.question('\n⚠️ Connection failed. Type "r" to retry or "q" to quit: ', async (answer) => {
                            if (answer.toLowerCase() === 'r') {
                                console.log('[DEBUG] User requested retry');
                                await this.waitForConnectionWithRetry(maxRetries);
                                resolve();
                            } else if (answer.toLowerCase() === 'q') {
                                console.log('👋 Goodbye!');
                                process.exit(0);
                            } else {
                                console.log('Invalid input. Retrying...');
                                await this.waitForConnectionWithRetry(maxRetries);
                                resolve();
                            }
                        });
                    });
                }
            }
        }
    }

    async requestPairingCode() {
        return new Promise((resolve) => {
            this.rl.question('\n📱 Enter your WhatsApp phone number (with country code, e.g., 919876543210): ', async (phoneNumber) => {
                const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
                
                if (cleanNumber.length < 10) {
                    console.log('❌ Invalid phone number. Please try again.');
                    return this.requestPairingCode().then(resolve);
                }

                try {
                    console.log('[DEBUG] Requesting pairing code for:', cleanNumber);
                    console.log('\n🔄 Generating pairing code...');
                    const pairingCode = await this.socket.requestPairingCode(cleanNumber);
                    console.log('[DEBUG] Pairing code received:', pairingCode);
                    console.log('\n╔════════════════════════════════════╗');
                    console.log('║  YOUR PAIRING CODE: ' + pairingCode.padEnd(10) + '║');
                    console.log('╚════════════════════════════════════╝');
                    console.log('\n📝 Open WhatsApp → Settings → Linked Devices');
                    console.log('   → Link a device → Enter the code above');
                    resolve();
                } catch (error) {
                    console.error('[DEBUG] Pairing code error:', error.message);
                    console.error('❌ Failed to generate pairing code:', error.message);
                    console.log('Please try again...');
                    return this.requestPairingCode().then(resolve);
                }
            });
        });
    }

    async waitForConnection(timeout = 120000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkConnection = setInterval(() => {
                if (this.isConnected) {
                    clearInterval(checkConnection);
                    resolve(true);
                }
                
                if (Date.now() - startTime > timeout) {
                    clearInterval(checkConnection);
                    reject(new Error('Connection timeout after ' + (timeout/1000) + ' seconds'));
                }
            }, 1000);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendMessage(phoneNumber, message) {
        if (!this.socket || !this.isConnected) {
            throw new Error('WhatsApp not connected');
        }

        const formattedNumber = this.formatPhoneNumber(phoneNumber);
        
        try {
            const result = await this.socket.sendMessage(formattedNumber, {
                text: message
            });
            
            console.log(`✅ Message sent to ${phoneNumber}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to send message:`, error.message);
            throw error;
        }
    }

    formatPhoneNumber(phone) {
        let number = phone.replace(/[^0-9]/g, '');
        
        if (!number.startsWith('91') && number.length === 10) {
            number = '91' + number;
        }
        
        if (!number.endsWith('@s.whatsapp.net')) {
            number = number + '@s.whatsapp.net';
        }
        
        return number;
    }

    async sendVoiceMessage(phoneNumber, audioPath) {
        if (!this.socket || !this.isConnected) {
            throw new Error('WhatsApp not connected');
        }

        const formattedNumber = this.formatPhoneNumber(phoneNumber);
        
        try {
            const audioBuffer = fs.readFileSync(audioPath);
            
            const result = await this.socket.sendMessage(formattedNumber, {
                audio: audioBuffer,
                mimetype: 'audio/wav'
            });
            
            console.log(`✅ Voice message sent to ${phoneNumber}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to send voice message:`, error.message);
            throw error;
        }
    }

    isReady() {
        return this.isConnected;
    }

    async disconnect() {
        if (this.socket) {
            this.socket.end();
            this.isConnected = false;
        }
    }
}

module.exports = WhatsAppHandler;
