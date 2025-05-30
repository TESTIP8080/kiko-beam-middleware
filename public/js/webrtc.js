// webrtc.js - Enhanced Hyperjump with Instant Animation

// Daily.co configuration уже определена в config.js

class KikoWebRTC {
  constructor() {
    this.callFrame = null;
    this.connected = false;
    this.roomName = null;
    this.roomUrl = null;
    this.callInProgress = false;
    this.audioMuted = false;
    this.videoMuted = false;
    
    // Animation and sound controllers
    this.animationController = null;
    this.soundController = null;
    
    // Initialize controllers
    this._initializeControllers();
    
    // Create Daily.co room URLs
    this.baseUrl = `https://${DAILY_CONFIG.domain}`;
  }
  
  _initializeControllers() {
    this.animationController = new HyperjumpAnimation();
    this.soundController = new HyperjumpSound();
  }
  
  async makeCall(roomId, contactName = 'Unknown') {
    if (this.callInProgress) {
      console.warn('Call already in progress');
      return;
    }
    
    try {
      // IMMEDIATELY show teleport area and start animation
      const teleportArea = document.getElementById('teleport-area');
      if (teleportArea) {
        teleportArea.style.display = 'flex';
        teleportArea.classList.add('hyperjump-active');
        
        // Hide contact manager during call
        const contactManager = teleportArea.querySelector('.contact-manager');
        if (contactManager) {
          contactManager.style.display = 'none';
        }
      }
      
      // Stop speech recognition and clear queue only for teleport kiko
      if (contactName === 'KiKo 2' && recognition && recognition._isRunning) {
        recognition._manualStop = true; // Mark as manually stopped
        recognition.stop();
        clearSpeechQueue();
        updateRecognitionStatus('Microphone off during call');
      }
      
      // Generate room URL
      this.roomName = roomId || `kiko-${Date.now()}`;
      this.roomUrl = `${this.baseUrl}/${this.roomName}`;
      
      console.log('🚀 Initiating hyperjump to:', this.roomUrl);
      
      // Update UI
      this._updateStatus(`Initiating hyperjump to ${contactName}...`, 'info');
      
      // Start hyperjump animation IMMEDIATELY
      this.animationController.startSequence();
      
      // Create Daily.co call frame in parallel with animation
      setTimeout(async () => {
        await this._createDailyFrame();
        await this._joinRoom();
      }, 1500); // Start connecting while animation plays
      
      this.callInProgress = true;
      
    } catch (error) {
      console.error('Error starting call:', error);
      this._updateStatus('Hyperjump failed: ' + error.message, 'error');
      this.soundController.playError();
      this.animationController.reset();
    }
  }
  
  async _createDailyFrame() {
    console.log('🔧 Creating Daily.co frame...');
    
    if (!window.DailyIframe) {
      console.log('📦 Loading Daily.co SDK...');
      // Load Daily.co SDK if not loaded
      await this._loadDailyScript();
    }
    
    // Get or create container
    const container = document.getElementById('daily-container') || this._createContainer();
    console.log('📦 Container ready:', container);
    
    try {
      // Create call frame
      this.callFrame = DailyIframe.createFrame(container, {
        showLeaveButton: false,
        showFullscreenButton: true,
        iframeStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '20px'
        }
      });
      
      console.log('✅ Daily.co frame created successfully');
      
      // Set up event listeners
      this._setupDailyEvents();
    } catch (error) {
      console.error('❌ Failed to create Daily.co frame:', error);
      throw error;
    }
  }
  
  _loadDailyScript() {
    return new Promise((resolve, reject) => {
      if (window.DailyIframe) {
        console.log('✅ Daily.co SDK already loaded');
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Daily.co SDK loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Daily.co SDK:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }
  
  _createContainer() {
    const container = document.createElement('div');
    container.id = 'daily-container';
    container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      height: 90%;
      max-width: 1200px;
      max-height: 800px;
      z-index: 10;
      opacity: 0;
      transition: opacity 1s ease-in;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 0 80px rgba(3, 218, 198, 0.6);
      border: 2px solid rgba(3, 218, 198, 0.3);
    `;
    
    const teleportArea = document.getElementById('teleport-area');
    if (teleportArea) {
      teleportArea.appendChild(container);
    }
    
    return container;
  }
  
  _setupDailyEvents() {
    if (!this.callFrame) return;
    
    this.callFrame
      .on('joined-meeting', () => {
        console.log('✅ Hyperjump successful!');
        this.connected = true;
        this._updateStatus('Hyperjump established', 'success');
        this.animationController.completeSequence();
        this.soundController.playConnected();
        
        // Fade in the video
        const container = document.getElementById('daily-container');
        if (container) {
          container.style.opacity = '1';
        }
      })
      .on('left-meeting', () => {
        console.log('🚪 Left hyperjump');
        this.connected = false;
        this.endCall();
      })
      .on('error', (error) => {
        console.error('❌ Daily.co error:', error);
        this._updateStatus('Connection error: ' + error.errorMsg, 'error');
        this.soundController.playError();
        this.animationController.reset();
      })
      .on('participant-joined', (event) => {
        console.log('👤 Participant joined:', event.participant.user_name);
        this._updateStatus(`${event.participant.user_name} joined the hyperjump`, 'info');
        this.soundController.playUserJoined();
      })
      .on('participant-left', (event) => {
        console.log('👤 Participant left:', event.participant.user_name);
        this._updateStatus(`${event.participant.user_name} left the hyperjump`, 'info');
      });
  }
  
  async _joinRoom() {
    if (!this.callFrame) {
      throw new Error('Call frame not initialized');
    }
    
    console.log('🚀 Joining Daily.co room:', this.roomUrl);
    
    try {
      const joinResult = await this.callFrame.join({
        url: this.roomUrl,
        userName: 'KIKO User',
        startVideoOff: false,
        startAudioOff: false
      });
      
      console.log('✅ Successfully joined room:', joinResult);
    } catch (error) {
      console.error('❌ Error joining room:', error);
      console.error('Room URL:', this.roomUrl);
      console.error('Error details:', error.message);
      
      // Check if it's a network error
      if (error.message && error.message.includes('network')) {
        this._updateStatus('Network error - please check your connection', 'error');
      } else if (error.message && error.message.includes('permission')) {
        this._updateStatus('Camera/microphone permission denied', 'error');
      } else {
        this._updateStatus('Failed to join room: ' + error.message, 'error');
      }
      
      throw error;
    }
  }
  
  // Special KiKo 2 demo call with enhanced effects
  async callKiko2() {
    console.log('🤖 Initiating KiKo 2 demo hyperjump...');
    
    // Add special demo class for enhanced visuals
    const teleportArea = document.getElementById('teleport-area');
    if (teleportArea) {
      teleportArea.classList.add('kiko2-demo');
    }
    
    // Use special demo room
    await this.makeCall(DAILY_CONFIG.defaultRoom, 'KiKo 2');
  }
  
  async endCall() {
    console.log('🛑 Ending hyperjump...');
    
    // Stop sounds
    this.soundController.stopAll();
    
    // Leave Daily.co room
    if (this.callFrame) {
      try {
        await this.callFrame.leave();
        this.callFrame.destroy();
      } catch (error) {
        console.error('Error leaving call:', error);
      }
      this.callFrame = null;
    }
    
    // Reset animation
    this.animationController.reset();
    
    // Hide container with fade out
    const container = document.getElementById('daily-container');
    if (container) {
      container.style.opacity = '0';
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 1000);
    }
    
    // Hide teleport area
    const teleportArea = document.getElementById('teleport-area');
    if (teleportArea) {
      setTimeout(() => {
        teleportArea.style.display = 'none';
        teleportArea.classList.remove('hyperjump-active', 'kiko2-demo');
        
        // Show contact manager again
        const contactManager = teleportArea.querySelector('.contact-manager');
        if (contactManager) {
          contactManager.style.display = 'block';
        }
      }, 500);
    }
    
    // Update state
    this.connected = false;
    this.callInProgress = false;
    this.roomName = null;
    this.roomUrl = null;
    
    this._updateStatus('Hyperjump ended', 'disconnected');
    this.soundController.playDisconnect();

    // Restart speech recognition after call ends
    if (recognition) {
      recognition._manualStop = false; // Reset manual stop flag
      if (!recognition._isRunning) {
        try {
          // Add delay before restarting
          setTimeout(() => {
            if (recognition && !recognition._isRunning) {
              recognition.start();
              updateRecognitionStatus('Listening...');
            }
          }, 1000);
        } catch(e) {
          console.error("Error restarting speech recognition:", e);
        }
      }
    }
  }
  
  toggleAudio() {
    if (this.callFrame) {
      this.audioMuted = !this.audioMuted;
      this.callFrame.setLocalAudio(!this.audioMuted);
      
      const muteBtn = document.getElementById('mute-audio-btn');
      if (muteBtn) {
        muteBtn.textContent = this.audioMuted ? '🔇 Unmute' : '🎤 Mute';
        muteBtn.style.background = this.audioMuted ? 
          'rgba(244, 67, 54, 0.8)' : 'rgba(0, 0, 0, 0.8)';
      }
    }
  }
  
  toggleVideo() {
    if (this.callFrame) {
      this.videoMuted = !this.videoMuted;
      this.callFrame.setLocalVideo(!this.videoMuted);
      
      const videoBtn = document.getElementById('mute-video-btn');
      if (videoBtn) {
        videoBtn.textContent = this.videoMuted ? '📷 Video On' : '📹 Video Off';
        videoBtn.style.background = this.videoMuted ? 
          'rgba(244, 67, 54, 0.8)' : 'rgba(0, 0, 0, 0.8)';
      }
    }
  }
  
  _updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('teleport-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${type}`;
    }
  }
}

// Enhanced Hyperjump Animation Controller
class HyperjumpAnimation {
  constructor() {
    this.container = null;
    this.stars = [];
    this.animationPhase = 0;
    this.animationInProgress = false;
  }
  
  async startSequence() {
    if (this.animationInProgress) return;
    this.animationInProgress = true;
    
    // Get or create animation container
    this.container = document.getElementById('hyperjump-animation') || this.createContainer();
    
    // Create visual elements
    this.createStarField();
    this.createTunnelLines();
    
    // Show container IMMEDIATELY
    this.container.style.display = 'block';
    
    // Start with charge sound
    window.kikoWebRTC.soundController.playCharge();
    
    // Execute animation phases
    await this.executePhases();
  }
  
  createContainer() {
    const container = document.createElement('div');
    container.id = 'hyperjump-animation';
    container.className = 'hyperjump-animation';
    container.innerHTML = `
      <div class="stars-background"></div>
      <div class="stars-container"></div>
      <div class="tunnel-lines"></div>
      <div class="white-flash"></div>
    `;
    
    // Add to body for fullscreen effect
    document.body.appendChild(container);
    
    return container;
  }
  
  createStarField() {
    const starsContainer = this.container.querySelector('.stars-container');
    starsContainer.innerHTML = '';
    this.stars = [];
    
    // Create 200 stars for dense field
    for (let i = 0; i < 200; i++) {
      const star = document.createElement('div');
      star.className = 'hyperjump-star';
      
      // Position stars from center for tunnel effect
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 50;
      
      const x = 50 + distance * Math.cos(angle);
      const y = 50 + distance * Math.sin(angle);
      
      star.style.left = x + '%';
      star.style.top = y + '%';
      
      // Random size
      const size = Math.random() * 3 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      
      // Store position data
      star.dataset.angle = angle;
      star.dataset.distance = distance;
      
      starsContainer.appendChild(star);
      this.stars.push(star);
    }
  }
  
  createTunnelLines() {
    const tunnelContainer = this.container.querySelector('.tunnel-lines');
    tunnelContainer.innerHTML = '';
    
    // Create radial lines
    for (let i = 0; i < 16; i++) {
      const line = document.createElement('div');
      line.className = 'tunnel-line';
      
      const angle = (i / 16) * 360;
      line.style.transform = `rotate(${angle}deg) translateX(50%)`;
      line.style.left = '50%';
      line.style.top = '50%';
      
      tunnelContainer.appendChild(line);
    }
  }
  
  async executePhases() {
    // Phase 1: Stars pulse (1s)
    this.container.classList.add('phase-pulse');
    await this.wait(1000);
    
    // Phase 2: Acceleration (1s)
    this.container.classList.remove('phase-pulse');
    this.container.classList.add('phase-acceleration');
    await this.wait(1000);
    
    // Phase 3: Jump with sound (0.5s)
    window.kikoWebRTC.soundController.playJump();
    this.container.classList.remove('phase-acceleration');
    this.container.classList.add('phase-jump');
    await this.wait(500);
    
    // Phase 4: Flash (0.3s)
    this.container.classList.add('phase-flash');
    await this.wait(300);
    
    // Phase 5: Emerge (1s)
    this.container.classList.add('phase-emerge');
    await this.wait(1000);
    
    // Keep traveling animation until connected
    this.container.classList.add('phase-traveling');
  }
  
  completeSequence() {
    if (this.container) {
      this.container.classList.add('complete');
      
      setTimeout(() => {
        this.reset();
      }, 1000);
    }
  }
  
  reset() {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.className = 'hyperjump-animation';
      
      // Remove from DOM
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
    
    this.stars = [];
    this.animationPhase = 0;
    this.animationInProgress = false;
    this.container = null;
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Enhanced Sound Controller
class HyperjumpSound {
  constructor() {
    this.audioContext = null;
    this.baseVolume = 0.8; // Louder volume
    this.initializeAudio();
  }
  
  initializeAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  playCharge() {
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    // Dual oscillator for richer sound
    osc1.frequency.setValueAtTime(80, this.audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 1.5);
    
    osc2.frequency.setValueAtTime(120, this.audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 1.5);
    osc2.detune.setValueAtTime(5, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(this.baseVolume * 0.7, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.audioContext.currentTime + 1.5);
    osc2.stop(this.audioContext.currentTime + 1.5);
  }
  
  playJump() {
    // Star Wars hyperjump sound with deep engine hum and lightning effect
    const osc1 = this.audioContext.createOscillator(); // Deep engine hum
    const osc2 = this.audioContext.createOscillator(); // Lightning effect
    const osc3 = this.audioContext.createOscillator(); // Sub-bass rumble
    const gain = this.audioContext.createGain();
    const filter1 = this.audioContext.createBiquadFilter(); // Engine filter
    const filter2 = this.audioContext.createBiquadFilter(); // Lightning filter
    
    // Deep engine hum - very low frequency
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(40, this.audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 1.5);
    
    // Lightning effect - sharp rising tone
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.5);
    osc2.detune.setValueAtTime(50, this.audioContext.currentTime);
    
    // Sub-bass rumble for power
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(30, this.audioContext.currentTime);
    osc3.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 1.5);
    
    // Engine filter - deep rumble
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(100, this.audioContext.currentTime);
    filter1.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 1.5);
    filter1.Q.setValueAtTime(1, this.audioContext.currentTime);
    
    // Lightning filter - sharp effect
    filter2.type = 'highpass';
    filter2.frequency.setValueAtTime(500, this.audioContext.currentTime);
    filter2.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.5);
    filter2.Q.setValueAtTime(12, this.audioContext.currentTime);
    
    // Volume envelope - starts with engine, then lightning
    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(this.baseVolume * 0.9, this.audioContext.currentTime + 0.2);
    gain.gain.setValueAtTime(this.baseVolume * 0.9, this.audioContext.currentTime + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);
    
    // Connect oscillators through filters
    osc1.connect(filter1);
    osc2.connect(filter2);
    osc3.connect(filter1);
    
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(this.audioContext.destination);
    
    // Start and stop timing
    osc1.start();
    osc2.start();
    osc3.start();
    osc1.stop(this.audioContext.currentTime + 1.5);
    osc2.stop(this.audioContext.currentTime + 0.5);
    osc3.stop(this.audioContext.currentTime + 1.5);
  }
  
  playConnected() {
    // Victory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.1);
      
      gain.gain.setValueAtTime(0, this.audioContext.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(this.baseVolume * 0.8, this.audioContext.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 1);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      osc.start(this.audioContext.currentTime + i * 0.1);
      osc.stop(this.audioContext.currentTime + i * 0.1 + 1);
    });
  }
  
  playUserJoined() {
    // Chime sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
    osc.frequency.setValueAtTime(1174.66, this.audioContext.currentTime + 0.1);
    
    gain.gain.setValueAtTime(this.baseVolume * 0.6, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }
  
  playDisconnect() {
    // Descending sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.6);
    
    gain.gain.setValueAtTime(this.baseVolume * 0.7, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.6);
  }
  
  playError() {
    // Alarm sound
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, this.audioContext.currentTime + i * 0.15);
      osc.frequency.setValueAtTime(200, this.audioContext.currentTime + i * 0.15 + 0.075);
      
      gain.gain.setValueAtTime(this.baseVolume * 0.8, this.audioContext.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0, this.audioContext.currentTime + i * 0.15 + 0.1);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      osc.start(this.audioContext.currentTime + i * 0.15);
      osc.stop(this.audioContext.currentTime + i * 0.15 + 0.1);
    }
  }
  
  stopAll() {
    // Web Audio API automatically stops sounds
  }
}

// Create global instance
window.kikoWebRTC = new KikoWebRTC();

// Auto-load Daily.co script on page load
(function() {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@daily-co/daily-js';
  script.async = true;
  script.onload = () => {
    console.log('✅ Daily.co SDK loaded successfully');
  };
  script.onerror = () => {
    console.error('❌ Failed to load Daily.co SDK');
  };
  document.head.appendChild(script);
})();