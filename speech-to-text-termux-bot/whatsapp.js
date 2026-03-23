const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const SESSION_DIR = './auth_info';

class WhatsAppHandler {
    constructor() {
        this.socket = null;
        this.isConnected = false;
    }

    async initialize() {
        console.log('📱 Initializing WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['TermuxBot', 'Chrome', '120.0'],
            version: [2, 3000, 1034074495]
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('\n📱 Scan this QR code with your WhatsApp:');
                console.log(QRCode.toString(qr, { type: 'terminal' }));
            }
            
            if (connection === 'close') {
                const reason = DisconnectReason[lastDisconnect?.error] || lastDisconnect?.error;
                console.log('❌ Connection closed:', reason);
                this.isConnected = false;
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connected successfully!');
                this.isConnected = true;
            }
        });

        await this.waitForConnection();
    }

    async waitForConnection(timeout = 60000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkConnection = setInterval(() => {
                if (this.isConnected) {
                    clearInterval(checkConnection);
                    resolve(true);
                }
                
                if (Date.now() - startTime > timeout) {
                    clearInterval(checkConnection);
                    reject(new Error('Connection timeout'));
                }
            }, 1000);
        });
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
