const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RECORDING_DIR = '/data/data/com.termux/files/home/storage/shared/recordings';
const TEMP_DIR = '/data/data/com.termux/files/home';

function ensureDirectories() {
    if (!fs.existsSync(RECORDING_DIR)) {
        fs.mkdirSync(RECORDING_DIR, { recursive: true });
    }
}

async function startRecording(filename = 'voice_message.wav') {
    return new Promise((resolve, reject) => {
        const filepath = path.join(RECORDING_DIR, filename);
        
        const cmd = `termux-microphone-record -f "${filepath}" -l 60`;
        
        console.log('🎤 Starting recording... Say your message (max 60 seconds):');
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Error starting recording:', error.message);
                reject(error);
                return;
            }
            console.log('Recording started:', filepath);
            resolve(filepath);
        });
    });
}

async function stopRecording() {
    return new Promise((resolve, reject) => {
        const cmd = 'termux-microphone-record -stop';
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Error stopping recording:', error.message);
                reject(error);
                return;
            }
            console.log('✓ Recording stopped');
            resolve(true);
        });
    });
}

async function recordAudio(timeoutSeconds = 30) {
    ensureDirectories();
    
    const filename = `voice_${Date.now()}.wav`;
    const filepath = path.join(RECORDING_DIR, filename);
    
    return new Promise((resolve, reject) => {
        console.log('🎤 Recording will start... Speak your message.');
        console.log(`   Recording for max ${timeoutSeconds} seconds...`);
        
        const recordingProcess = spawn('termux-microphone-record', [
            '-f', filepath,
            '-l', timeoutSeconds.toString()
        ]);
        
        recordingProcess.on('error', (err) => {
            console.error('Recording error:', err);
            reject(err);
        });
        
        setTimeout(() => {
            recordingProcess.kill('SIGTERM');
            console.log('✓ Recording complete:', filepath);
            resolve(filepath);
        }, timeoutSeconds * 1000);
    });
}

async function isRecordingAvailable() {
    return new Promise((resolve) => {
        exec('termux-microphone-record --help', (error) => {
            resolve(!error);
        });
    });
}

module.exports = {
    startRecording,
    stopRecording,
    recordAudio,
    isRecordingAvailable,
    RECORDING_DIR
};
