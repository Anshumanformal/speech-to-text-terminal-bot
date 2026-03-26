const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const fs = require('fs');

const SESSION_DIR = './auth_info';

class WhatsAppHandler {
    constructor(rl) {
        this.socket = null;
        this.isConnected = false;
        this.rl = rl;
        this.connectionState = 'none';
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
            
            this.connectionState = connection;
            
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

        console.log('[DEBUG] Waiting for socket to start connecting...');
        await this.waitForSocketConnecting();
        console.log('[DEBUG] Socket is now connecting, waiting for connection to stabilize...');
        await this.delay(3000);
        console.log('[DEBUG] Connection stabilized, requesting pairing code...');
        await this.requestPairingCode();
        await this.waitForConnectionWithRetry();
    }

    async waitForSocketConnecting(timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkState = setInterval(() => {
                console.log('[DEBUG] Current connection state:', this.connectionState);
                
                if (this.connectionState === 'connecting') {
                    clearInterval(checkState);
                    console.log('[DEBUG] Connection state is now: connecting');
                    resolve(true);
                }
                
                if (this.connectionState === 'close') {
                    clearInterval(checkState);
                    reject(new Error('Connection closed before pairing code could be requested'));
                }
                
                if (Date.now() - startTime > timeout) {
                    clearInterval(checkState);
                    reject(new Error('Timeout waiting for socket to start connecting'));
                }
            }, 500);
        });
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
            this.rl.question('\n📱 Enter your 10-digit phone number (without country code): ', async (phoneNumber) => {
                const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
                
                if (cleanNumber.length !== 10) {
                    console.log('❌ Please enter exactly 10 digits.');
                    return this.requestPairingCode().then(resolve);
                }

                const fullNumber = '91' + cleanNumber;
                console.log('[DEBUG] User entered phone number:', cleanNumber);
                console.log('[DEBUG] Full number with country code:', fullNumber);
                console.log('[DEBUG] Phone number length:', fullNumber.length);
                console.log('[DEBUG] Socket ready:', this.socket ? 'yes' : 'no');
                
                console.log('[DEBUG] Waiting 2 seconds before requesting pairing code...');
                await this.delay(2000);
                
                console.log('[DEBUG] Checking connection state before API call...');
                console.log('[DEBUG] Current connection state:', this.connectionState);
                console.log('[DEBUG] Is socket connected:', this.isConnected);
                
                if (this.connectionState === 'close') {
                    console.error('[DEBUG] Connection already closed! Attempting to reconnect...');
                    console.log('[DEBUG] Recreating socket...');
                    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
                    this.socket = makeWASocket({
                        auth: state,
                        printQRInTerminal: false,
                        browser: ['TermuxBot', 'Chrome', '120.0'],
                        version: [2, 3000, 1034074495]
                    });
                    this.socket.ev.on('creds.update', saveCreds);
                    console.log('[DEBUG] Socket recreated, waiting for connection...');
                    await this.waitForSocketConnecting();
                    await this.delay(3000);
                }

                try {
                    console.log('\n[DEBUG] Calling socket.requestPairingCode()...');
                    console.log('[DEBUG] Request payload:', { phoneNumber: fullNumber });
                    
                    const pairingCode = await this.socket.requestPairingCode(fullNumber);
                    
                    console.log('[DEBUG] API call completed successfully');
                    console.log('[DEBUG] Response type:', typeof pairingCode);
                    console.log('[DEBUG] Response value:', pairingCode);
                    console.log('[DEBUG] Response length:', pairingCode ? pairingCode.toString().length : 'null');
                    
                    console.log('\n╔════════════════════════════════════╗');
                    console.log('║  YOUR PAIRING CODE: ' + String(pairingCode).padEnd(10) + '║');
                    console.log('╚════════════════════════════════════╝');
                    console.log('\n📝 Open WhatsApp → Settings → Linked Devices');
                    console.log('   → Link a device → Enter the code above');
                    resolve();
                } catch (error) {
                    console.error('[DEBUG] ====================');
                    console.error('[DEBUG] PAIRING CODE ERROR');
                    console.error('[DEBUG] ====================');
                    console.error('[DEBUG] Error name:', error.name);
                    console.error('[DEBUG] Error message:', error.message);
                    console.error('[DEBUG] Error code:', error.code);
                    console.error('[DEBUG] Error status:', error.status);
                    console.error('[DEBUG] Is Boom:', error.isBoom);
                    console.error('[DEBUG] Is Server:', error.isServer);
                    console.error('[DEBUG] Output status code:', error.output?.statusCode);
                    console.error('[DEBUG] Output payload:', JSON.stringify(error.output?.payload));
                    console.error('[DEBUG] Output headers:', error.output?.headers);
                    console.error('[DEBUG] Data:', error.data);
                    console.error('[DEBUG] Stack trace:', error.stack);
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
