class SpeechRecognizer {
  constructor(socketUrl) {
    this.socket = null;
    this.socketUrl = socketUrl;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.isRecording = false;
    this.onTranscriptReceived = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  // Initialize speech recognition
  async init() {
    try {
      // Connect to our server, which will communicate with Deepgram
      this.socket = new WebSocket(this.socketUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.retryCount = 0; // Reset retry count on successful connection
      };
      
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.transcript && this.onTranscriptReceived) {
          this.onTranscriptReceived(data.transcript);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleError();
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.isRecording = false;
        this.handleError();
      };
      
      // Initialize audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      this.handleError();
      return false;
    }
  }

  // Handle errors and attempt recovery
  async handleError() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Attempting to recover (${this.retryCount}/${this.maxRetries})...`);
      
      // Stop any existing recording
      if (this.isRecording) {
        await this.stopRecording();
      }
      
      // Close existing connections
      if (this.socket) {
        this.socket.close();
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      // Reinitialize
      await this.init();
      
      // Restart recording if it was active
      if (this.isRecording) {
        await this.startRecording();
      }
    } else {
      console.error('Max retry attempts reached. Please reload the page.');
      // Notify user to reload
      if (this.onTranscriptReceived) {
        this.onTranscriptReceived('❌ Connection error. Please reload the page.');
      }
    }
  }

  // Start recording
  async startRecording() {
    if (this.isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Create MediaRecorder with settings for better quality
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(event.data);
        }
      };
      
      // Record in small chunks of 250ms for fast recognition
      this.mediaRecorder.start(250);
      this.isRecording = true;
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.handleError();
    }
  }

  // Stop recording
  async stopRecording() {
    if (!this.isRecording) return;
    
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      
      if (this.mediaRecorder && this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      
      this.isRecording = false;
      console.log('Recording stopped');
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  // Close connection
  close() {
    this.stopRecording();
    if (this.socket) {
      this.socket.close();
    }
  }

  // Set transcript callback handler
  setTranscriptCallback(callback) {
    this.onTranscriptReceived = callback;
  }
}

// Export for use in application
window.SpeechRecognizer = SpeechRecognizer;