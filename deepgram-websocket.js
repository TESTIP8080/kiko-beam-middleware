const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || 'YOUR_DEEPGRAM_API_KEY';

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Handler for receiving audio from client and sending through REST API
    ws.on('message', async (message) => {
      try {
        // Convert binary data to Buffer
        const audioBuffer = Buffer.from(message);
        
        // Send to Deepgram through REST API
        const response = await axios({
          method: 'post',
          url: 'https://api.deepgram.com/v1/listen?language=en&model=nova&smart_format=true&interim_results=true',
          headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/webm'
          },
          data: audioBuffer
        });
        
        // Get text from response
        if (response.data && response.data.results && response.data.results.channels && 
            response.data.results.channels[0] && response.data.results.channels[0].alternatives) {
          
          const transcript = response.data.results.channels[0].alternatives[0].transcript;
          const isFinal = !response.data.results.is_final === false; // default to true
          
          if (transcript) {
            // Send recognized text to client
            ws.send(JSON.stringify({
              transcript: transcript,
              isFinal: isFinal
            }));
          }
        }
      } catch (error) {
        console.error('Error in WebSocket recognition:', error.message);
        
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data));
        }
        
        ws.send(JSON.stringify({ 
          error: 'Speech recognition error',
          details: error.message 
        }));
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return wss;
}

module.exports = setupWebSocket;