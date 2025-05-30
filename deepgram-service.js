const axios = require('axios');
const fs = require('fs');

class DeepgramService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.options = {
      language: 'en',
      model: 'nova',
      smart_format: true
    };
  }

  // Transcribe audio file
  async transcribeFile(filePath) {
    try {
      const audio = fs.readFileSync(filePath);
      
      // Direct request to Deepgram API
      const response = await axios({
        method: 'post',
        url: `https://api.deepgram.com/v1/listen?language=${this.options.language}&model=${this.options.model}&smart_format=${this.options.smart_format}`,
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'audio/wav'
        },
        data: audio
      });
      
      // Get transcript
      return response.data.results.channels[0].alternatives[0].transcript;
    } catch (error) {
      console.error('Error transcribing audio file:', error.message);
      throw error;
    }
  }

  // Create streaming connection
  createStreamingConnection(onTranscript) {
    try {
      // Create WebSocket connection
      const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?language=${this.options.language}&model=${this.options.model}&smart_format=${this.options.smart_format}&interim_results=true`);
      
      // Add authorization header
      ws.addEventListener('open', () => {
        console.log('Deepgram WebSocket connection established');
      });
      
      // Handle messages
      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = !data.is_final === false;
          
          if (transcript && onTranscript) {
            onTranscript(transcript, isFinal);
          }
        }
      });
      
      // Handle errors
      ws.addEventListener('error', (error) => {
        console.error('Deepgram WebSocket error:', error);
      });
      
      // Handle close
      ws.addEventListener('close', () => {
        console.log('Deepgram WebSocket connection closed');
      });
      
      return ws;
    } catch (error) {
      console.error('Error creating Deepgram streaming connection:', error.message);
      throw error;
    }
  }
}

module.exports = DeepgramService;