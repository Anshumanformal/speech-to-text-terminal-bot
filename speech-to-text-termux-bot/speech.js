const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SpeechToText {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.assemblyai.com/v2';
    }

    async transcribe(audioPath) {
        if (!this.apiKey) {
            throw new Error('AssemblyAI API key not set. Please set ASSEMBLYAI_API_KEY in .env file');
        }

        console.log('🔄 Transcribing audio...');

        try {
            const audioBuffer = fs.readFileSync(audioPath);
            const audioBase64 = audioBuffer.toString('base64');

            const uploadResponse = await axios.post(
                `${this.baseUrl}/upload`,
                audioBase64,
                {
                    headers: {
                        'authorization': this.apiKey,
                        'content-type': 'application/octet-stream'
                    }
                }
            );

            const audioUrl = uploadResponse.data.upload_url;

            const transcriptResponse = await axios.post(
                `${this.baseUrl}/transcript`,
                {
                    audio_url: audioUrl,
                    language_code: 'en',
                    punctuate: true,
                    format_text: true
                },
                {
                    headers: {
                        'authorization': this.apiKey
                    }
                }
            );

            const transcriptId = transcriptResponse.data.id;

            const result = await this.waitForTranscription(transcriptId);

            console.log('✅ Transcription complete!');
            console.log('📝 Text:', result.text);

            return result.text;

        } catch (error) {
            console.error('❌ Transcription error:', error.message);
            throw error;
        }
    }

    async waitForTranscription(transcriptId, maxAttempts = 60) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const checkStatus = async () => {
                attempts++;

                try {
                    const response = await axios.get(
                        `${this.baseUrl}/transcript/${transcriptId}`,
                        {
                            headers: {
                                'authorization': this.apiKey
                            }
                        }
                    );

                    const status = response.data.status;

                    if (status === 'completed') {
                        resolve(response.data);
                    } else if (status === 'error') {
                        reject(new Error('Transcription failed: ' + response.data.error));
                    } else {
                        if (attempts >= maxAttempts) {
                            reject(new Error('Transcription timeout'));
                        } else {
                            setTimeout(checkStatus, 2000);
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            };

            checkStatus();
        });
    }
}

module.exports = SpeechToText;
