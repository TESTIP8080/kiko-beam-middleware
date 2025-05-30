/**
 * Class for working with Google Speech API through middleware
 */
class GoogleSpeechRecognition {
  constructor(options = {}) {
    this.middleware_url = options.middleware_url || 'http://localhost:3000';
    this.language = options.language || 'en-US';
    this.volumeMeter = options.volumeMeter || function() {};
    
    // Internal properties to mimic webkitSpeechRecognition API
    this._isRunning = false;
    this._manualStop = false;
    this._tempStop = false;
    this._wasStarted = false;
    this._completeCommand = '';
    this._intermediateTexts = [];
    
    // Initialize AudioContext and variables for recording
    this.initAudioContextAndRecorder();
    
    // Events
    this.onstart = function() {};
    this.onend = function() {};
    this.onerror = function() {};
    this.onresult = function() {};
  }
  
  /**
   * Initializes AudioContext and sets up objects for recording
   */
  initAudioContextAndRecorder() {
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioInput = null;
      this.recorder = null;
      this.chunks = [];
      
      console.log('Google Speech Recognition: AudioContext successfully initialized');
    } catch(e) {
      console.error('Google Speech Recognition: Error initializing AudioContext:', e);
    }
  }
  
  /**
   * Request microphone access and start recording
   */
  async start() {
    if (this._isRunning) {
      console.warn('Google Speech Recognition: Recording already started');
      return;
    }
    
    this._manualStop = false;
    this._tempStop = false;
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create and configure analyzer for volume measurement
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      // Connect microphone to audio context
      this.audioInput = this.audioContext.createMediaStreamSource(stream);
      this.audioInput.connect(analyser);
      
      // Read volume and pass to UI update function
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Create ScriptProcessor for audio data processing
      this.recorder = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect microphone to processor
      this.audioInput.connect(this.recorder);
      this.recorder.connect(this.audioContext.destination);
      
      // Periodically update volume level
      this.volumeInterval = setInterval(() => {
        if (!this._isRunning) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (const value of dataArray) {
          sum += value;
        }
        const average = sum / dataArray.length;
        const level = Math.min(100, Math.round((average / 128) * 100));
        
        // Call volume update function
        this.volumeMeter(level);
      }, 100);
      
      // Start recording
      this.chunks = [];
      this.recorder.onaudioprocess = (e) => {
        if (!this._isRunning) return;
        
        // Save recorded data
        this.chunks.push(e.inputBuffer.getChannelData(0).slice());
      };
      
      // Save stream for later closing
      this.mediaStream = stream;
      
      // Set flag and trigger event
      this._isRunning = true;
      this.onstart();
      
      // After 5 seconds stop recording and send data
      // for continuous operation with long phrases
      this.recordingTimeout = setTimeout(() => {
        if (this._isRunning && !this._manualStop && !this._tempStop) {
          this._tempStop = true;
          this.stopRecordingAndProcess();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Google Speech Recognition: Error starting recording:', error);
      this.onerror({ error: error.message || 'microphone-error' });
    }
  }
  
  /**
   * Stop recording and process audio
   */
  stopRecordingAndProcess() {
    if (!this._isRunning) return;
    
    // Clear volume update interval
    clearInterval(this.volumeInterval);
    
    // Clear recording timeout
    clearTimeout(this.recordingTimeout);
    
    // Stop audio processing
    if (this.recorder) {
      this.recorder.onaudioprocess = null;
    }
    
    // Stop media streams
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Process recorded data
    this.processAudioData();
    
    // Set flag and trigger event
    this._isRunning = false;
    this.onend();
  }
  
  /**
   * Stop recording
   */
  stop() {
    this._manualStop = true;
    this.stopRecordingAndProcess();
  }
  
  /**
   * Process recorded audio data and send to server
   */
  async processAudioData() {
    if (this.chunks.length === 0) {
      console.warn('Google Speech Recognition: No data to process');
      return;
    }
    
    try {
      console.log(`Google Speech Recognition: Processing ${this.chunks.length} audio chunks`);
      
      // Convert Float32Array to Int16Array (16-bit PCM)
      const mergedData = this.mergeChunksToInt16(this.chunks);
      
      // Create WAV file
      const wavBlob = this.createWavFromInt16(mergedData);
      
      // Send file to server
      await this.sendAudioToServer(wavBlob);
      
    } catch (error) {
      console.error('Google Speech Recognition: Error processing audio data:', error);
      this.onerror({ error: 'processing-error' });
    }
  }
  
  /**
   * Merge audio chunks into a single Int16Array
   */
  mergeChunksToInt16(chunks) {
    // Determine total array size
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }
    
    // Create Float32Array to combine all chunks
    const mergedFloat32 = new Float32Array(totalLength);
    
    // Copy data
    let offset = 0;
    for (const chunk of chunks) {
      mergedFloat32.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to Int16Array
    const int16Data = new Int16Array(mergedFloat32.length);
    for (let i = 0; i < mergedFloat32.length; i++) {
      // Convert float (-1 to 1) to int16 (-32768 to 32767)
      int16Data[i] = Math.max(-32768, Math.min(32767, Math.round(mergedFloat32[i] * 32767)));
    }
    
    return int16Data;
  }
  
  /**
   * Create WAV file from Int16Array
   */
  createWavFromInt16(int16Data) {
    // Sample rate - standard for speech
    const sampleRate = 16000;
    
    // Create WAV file header
    const buffer = new ArrayBuffer(44 + int16Data.length * 2);
    const view = new DataView(buffer);
    
    // Fill WAV header
    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk length
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, 1, true); // Number of channels (1 = mono)
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * 2, true); // Bytes per second
    view.setUint16(32, 2, true); // Bytes per sample
    view.setUint16(34, 16, true); // Bits per sample
    
    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, int16Data.length * 2, true); // Data length
    
    // Write audio data
    const dataView = new DataView(buffer);
    let offset = 44;
    for (let i = 0; i < int16Data.length; i++, offset += 2) {
      dataView.setInt16(offset, int16Data[i], true);
    }
    
    // Create Blob
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  /**
   * Helper function to write string to DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  /**
   * Send audio file to server for recognition
   */
  async sendAudioToServer(wavBlob) {
    try {
      console.log('Google Speech Recognition: Sending audio to server');
      
      // Create FormData and add file
      const formData = new FormData();
      formData.append('audio', wavBlob, 'speech.wav');
      
      // Add sessionId if it exists in localStorage
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }
      
      // Send request
      const response = await fetch(`${this.middleware_url}/api/speech-to-text`, {
        method: 'POST',
        body: formData
      });
      
      // Check response
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get result
      const result = await response.json();
      
      if (result.success && result.text) {
        console.log('Google Speech Recognition: Text successfully recognized:', result.text);
        
        // Create result object mimicking webkitSpeechRecognition
        const recognitionResult = {
          results: [
            [
              {
                transcript: result.text,
                confidence: 0.9
              }
            ]
          ]
        };
        
        // Set final result flag
        recognitionResult.results[0].isFinal = true;
        
        // Call result handler
        this.onresult(recognitionResult);
      } else {
        console.warn('Google Speech Recognition: Recognition error:', result.message);
        this.onerror({ error: 'recognition-error', message: result.message });
      }
      
    } catch (error) {
      console.error('Google Speech Recognition: Error sending audio to server:', error);
      this.onerror({ error: 'network-error', message: error.message });
    }
  }
}

// Export class for use in main code
window.GoogleSpeechRecognition = GoogleSpeechRecognition;