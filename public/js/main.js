// js/main.js - Enhanced Main initialization with Daily.co Hyperjump

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', {message, source, lineno, colno, error});
  addMessage(`⚠️ System error detected: ${message}`, false, true);
  return false;
};

// Enhanced unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  addMessage('⚠️ Quantum flux detected in hyperjump systems', false, true);
  event.preventDefault();
});

// Global state
let isCallActive = false;

// Weather cache
let weatherCache = {
  data: null,
  timestamp: 0,
  expiry: 5 * 60 * 1000 // 5 minutes
};

// Time cache
let timeCache = {
  data: null,
  timestamp: 0,
  expiry: 60 * 1000 // 1 minute
};

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Verify DOM elements are loaded
  if (!window.sendBtn) {
    console.error('Critical DOM elements not ready, initiating emergency reload...');
    setTimeout(() => window.location.reload(), 1000);
    return;
  }
  
  console.log('🚀 KiKo Beam systems initializing...');
  
  // Basic UI event listeners
  window.sendBtn.addEventListener('click', () => {
    activateSpeechSynthesis();
    sendMessage();
  });

  window.userInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter') {
      activateSpeechSynthesis();
      sendMessage();
    }
  });

  window.voiceBtn.addEventListener('click', () => {
    activateSpeechSynthesis();
    toggleVoiceInput();
  });

  window.cameraBtn.addEventListener('click', capturePhoto);

  // Enhanced YouTube controls
  window.youtubePlayBtn.addEventListener('click', () => {
    if (youtubePlayerState === 'paused') {
      continueYouTubeVideo();
      addMessage('Video resumed', false, false, true);
    } else {
      if (lastYouTubeUrl) {
        playVideo(lastYouTubeUrl);
        addMessage(`Playing: "${lastYouTubeQuery}"`);
      } else {
        addMessage('No video to play. What would you like to watch?');
      }
    }
  });

  window.youtubeSearchBtn.addEventListener('click', () => {
    currentDialogState = DialogState.WAITING_VIDEO_TOPIC;
    updateDialogState(DialogState.WAITING_VIDEO_TOPIC);
    addMessage('What would you like to watch?');
  });

  // Enhanced hyperjump controls
  window.closeTeleportBtn.addEventListener('click', () => {
    hideTeleportArea();
    addMessage('🌌 Hyperjump systems offline');
  });

  const endCallBtn = document.getElementById('end-call-btn');
  if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
      if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
        window.kikoWebRTC.endCall();
      } else {
        hideTeleportArea();
      }
      addMessage('🛑 Hyperjump transmission terminated');
    });
  }

  // QR code controls
  const closeQrBtn = document.getElementById('close-qr-btn');
  if (closeQrBtn) {
    closeQrBtn.addEventListener('click', () => {
      document.getElementById('qr-container').style.display = 'none';
    });
  }

  // Weather widget interaction
  window.weatherWidget.addEventListener('click', () => {
    showWeatherInChat();
  });

  // Enhanced keyboard navigation for all platforms
  document.addEventListener('keydown', (e) => {
    // Don't interfere if user is typing in input field
    if (document.activeElement === window.userInput) {
      return;
    }
    
    switch(e.keyCode) {
      case 13: // Enter/OK button
        if (document.activeElement === window.voiceBtn) {
          toggleVoiceInput();
        } else {
          window.userInput.focus();
        }
        e.preventDefault();
        break;
        
      case 37: // Left arrow - previous control
        if (window.youtubeContainer.style.display !== 'none') {
          window.youtubePlayBtn.focus();
        } else {
          window.userInput.focus();
        }
        e.preventDefault();
        break;
        
      case 39: // Right arrow - next control
        window.voiceBtn.focus();
        e.preventDefault();
        break;
        
      case 38: // Up arrow - media controls
        if (window.mediaPanel.classList.contains('active')) {
          if (window.cameraContainer.style.display !== 'none') {
            window.cameraBtn.focus();
          } else if (window.youtubeContainer.style.display !== 'none') {
            window.youtubeSearchBtn.focus();
          }
        }
        e.preventDefault();
        break;
        
      case 40: // Down arrow - hyperjump controls
        if (window.teleportArea.style.display === 'flex') {
          const demoBtn = document.getElementById('kiko2-demo-btn');
          if (demoBtn) {
            demoBtn.focus();
          }
        }
        e.preventDefault();
        break;
        
      case 27: // Back/ESC
        // Priority order: end call -> close teleport -> stop camera
        if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
          window.kikoWebRTC.endCall();
          addMessage('🛑 Emergency hyperjump termination');
        } else if (window.teleportArea.style.display === 'flex') {
          hideTeleportArea();
          addMessage('🌌 Hyperjump systems offline');
        } else {
          clearSpeechQueue();
          stopCamera();
          stopRecording();
        }
        e.preventDefault();
        break;
        
      // Quick shortcuts
      case 72: // H - Hyperjump
        if (!e.ctrlKey && !e.altKey) {
          showTeleportArea();
          addMessage('🌌 Hyperjump systems online');
          e.preventDefault();
        }
        break;
        
      case 67: // C - Camera
        if (!e.ctrlKey && !e.altKey) {
          if (!isCameraActive) {
            startCamera();
          } else {
            capturePhoto();
          }
          e.preventDefault();
        }
        break;
        
      case 77: // M - Mute/unmute microphone
        if (!e.ctrlKey && !e.altKey) {
          toggleVoiceInput();
          e.preventDefault();
        }
        break;
    }
  });

  console.log('✅ Basic event listeners initialized');
});

// Enhanced send message function
async function sendMessage() {
  if (!window.userInput) return;
  
  const text = window.userInput.value.trim(); 
  if (!text) return;
  
  clearSpeechQueue();
  resetSilenceTimer();
  
  // Track user interaction for preferences
  userPreferences.interactionCount++;
  
  addMessage(text, true);
  chatHistory.push({role: 'user', content: text}); 
  
  // Limit history size for performance
  if (chatHistory.length > MAX_HISTORY_SIZE) {
    chatHistory = chatHistory.slice(-MAX_HISTORY_SIZE);
  }
  
  window.userInput.value = ''; 
  showThinking();
  updateDialogState(DialogState.PROCESSING);
  
  try { 
    await processCommand(text); 
  } catch(err) {
    console.error('Command processing error:', err); 
    hideThinking(); 
    addMessage('⚠️ Quantum processing error. Please try again.', false, true);
    updateDialogState(DialogState.IDLE);
  }
}

// Enhanced initialization function
function init() {
  // Verify DOM readiness
  if (!window.chatContainer) {
    console.error('Critical DOM elements not loaded! Retrying...');
    setTimeout(init, 100);
    return;
  }
  
  console.log('🌌 Initializing KIKO MATRIX Hyperjump Systems...');
  
  // Initialize speech synthesis voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    // Load voices when they become available
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('🗣️ Speech synthesis voices loaded');
    };
  }
  
  // Add microphone restart button
  addRestartMicButton();
  
  // Initialize Daily.co WebRTC system
  if (window.kikoWebRTC) {
    console.log('🚀 Daily.co WebRTC system initialized');
  } else {
    console.warn('⚠️ Daily.co WebRTC system not available');
  }
  
  // Initialize contact manager
  if (window.contactManager) {
    console.log('📞 Contact manager initialized with quantum signatures');
  } else {
    console.warn('⚠️ Contact manager not available');
  }
  
  // Initialize weather system
  initWeather().then(() => {
    console.log('🌤️ Weather systems online');
  }).catch(err => {
    console.warn('⚠️ Weather system error:', err);
  });
  
  // Check for incoming hyperjump calls
  checkForIncomingCall();
  
  // Start silence monitoring
  resetSilenceTimer();
  
  // Initialize performance monitoring
  initPerformanceMonitoring();
  
  // Enhanced welcome sequence
  setTimeout(() => {
    const welcomeMessages = [
      '🚀 KIKO MATRIX Hyperjump Systems Online!',
      'Ready for multimedia, quantum communications, and AI assistance.',
      'Try: "play music", "take photo", "weather", "call KiKo 2" or just chat!'
    ];
    
    welcomeMessages.forEach((msg, index) => {
      setTimeout(() => {
        addMessage(msg, false, false, true);
      }, index * 800);
    });
    
    // Auto-start speech recognition after welcome
    setTimeout(() => {
      if (!recognition) {
        recognition = setupSpeechRecognition();
      }
      
      if (recognition && !recognition._isRunning) {
        try {
          recognition.start();
          console.log('🎤 Speech recognition quantum array activated');
          addMessage('🎤 Voice command systems ready. Quantum listening enabled.', false, false, true);
        } catch(e) {
          console.error("Quantum speech array initialization error:", e);
          setTimeout(() => {
            try { 
              recognition.start(); 
              console.log('🎤 Secondary speech array activated');
            } catch(e2) { 
              console.error("Secondary array error:", e2);
              addMessage("⚠️ Voice command array offline. Use 🎤 button to enable manually.", false, true);
            }
          }, 1500);
        }
      }
    }, 3000);
  }, 1200);
  
  // Android TV and large screen optimizations
  if (isAndroidTV) {
    initForTV();
    console.log('📺 Android TV optimizations applied');
  }
  
  // Initialize experimental features for localhost
  if (window.location.hostname === 'localhost') {
    initExperimentalFeatures();
  }
  
  console.log('✅ KIKO MATRIX fully operational. Quantum systems nominal.');
}

// Performance monitoring for complex animations
function initPerformanceMonitoring() {
  let performanceIssues = 0;
  
  // Monitor animation performance
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      if (entry.duration > 16.67) { // > 60fps threshold
        performanceIssues++;
        
        if (performanceIssues > 10) {
          console.warn('⚠️ Performance degradation detected, optimizing animations');
          
          // Reduce animation complexity
          document.documentElement.style.setProperty('--reduced-motion', 'true');
          
          // Reset counter
          performanceIssues = 0;
        }
      }
    });
  });
  
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      observer.observe({ entryTypes: ['measure'] });
    } catch (e) {
      console.log('Performance monitoring not available');
    }
  }
}

// Experimental features for development
function initExperimentalFeatures() {
  console.log('🧪 Loading experimental hyperjump features...');
  
  // Advanced hyperjump diagnostics
  window.hyperjumpDiagnostics = {
    testConnection: () => {
      if (window.kikoWebRTC) {
        addMessage('🔬 Running hyperjump diagnostics...');
        console.log('WebRTC State:', {
          callInProgress: window.kikoWebRTC.callInProgress,
          connected: window.kikoWebRTC.connected,
          currentRoom: window.kikoWebRTC.roomName
        });
        addMessage('📊 Diagnostics complete. Check console for details.');
      }
    },
    
    simulateIncomingCall: () => {
      addMessage('🧪 Simulating incoming hyperjump...');
      receiveCall('test_simulation_room');
    },
    
    performanceTest: () => {
      addMessage('⚡ Running performance test...');
      const start = performance.now();
      
      // Trigger complex animation
      const testAnimation = document.getElementById('teleport-animation');
      if (testAnimation) {
        testAnimation.style.display = 'block';
        testAnimation.classList.add('phase-jumping');
        
        setTimeout(() => {
          testAnimation.style.display = 'none';
          testAnimation.classList.remove('phase-jumping');
          
          const duration = performance.now() - start;
          addMessage(`⚡ Performance test complete: ${duration.toFixed(2)}ms`);
        }, 2000);
      }
    }
  };
  
  // Add console shortcuts
  window.kiko = {
    call: (name = 'KiKo 2') => startTeleportCall(DAILY_CONFIG.defaultRoom, name, true),
    end: () => window.kikoWebRTC?.endCall(),
    contacts: () => window.contactManager?.listContacts(),
    test: window.hyperjumpDiagnostics
  };
  
  console.log('🧪 Experimental features loaded. Try: kiko.call(), kiko.test.performanceTest()');
}

// Enhanced error recovery
function recoverFromError() {
  console.log('🔧 Initiating error recovery sequence...');
  
  // Reset recognition
  if (recognition) {
    try {
      recognition.stop();
      recognition = null;
    } catch (e) {
      console.log('Recognition cleanup completed');
    }
  }
  
  // Reset WebRTC if needed
  if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
    try {
      window.kikoWebRTC.endCall();
    } catch (e) {
      console.log('WebRTC cleanup completed');
    }
  }
  
  // Clear queues
  clearSpeechQueue();
  
  // Reset UI state
  updateDialogState(DialogState.IDLE);
  hideThinking();
  
  setTimeout(() => {
    recognition = setupSpeechRecognition();
    if (recognition) {
      try {
        recognition.start();
        addMessage('🔧 System recovery complete. All quantum arrays nominal.', false, false, true);
      } catch (e) {
        addMessage('🔧 System recovery partial. Manual voice activation may be needed.', false, true);
      }
    }
  }, 2000);
}

// Global recovery function
window.kikoRecover = recoverFromError;

// Start when DOM is ready
window.addEventListener('DOMContentLoaded', init);

// Enhanced HTTPS redirect with local development support
if (window.location.protocol !== 'https:' && 
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')) {
  console.log('🔒 Redirecting to HTTPS for quantum security...');
  window.location.href = window.location.href.replace('http:', 'https:');
}

// Service worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('🔧 Service Worker registered for offline hyperjump capabilities');
      })
      .catch(error => {
        console.log('Service Worker registration skipped');
      });
  });
}

// Visibility change handler for hyperjump calls
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('👁️ App became visible, checking quantum connections...');
    
    // Check if we have an active call that needs attention
    if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
      console.log('📡 Active hyperjump detected, maintaining connection...');
    }
    
    // Resume speech recognition if it was running
    if (recognition && !recognition._isRunning && !recognition._manualStop) {
      setTimeout(() => {
        try {
          recognition.start();
          console.log('🎤 Speech recognition resumed');
        } catch (e) {
          console.log('Speech recognition resume skipped');
        }
      }, 1000);
    }
  }
});

// Enhanced voice input toggle
function toggleVoiceInput() {
  // Don't allow microphone activation during calls
  if (isCallActive) {
    addMessage('🎤 Microphone disabled during calls', false, false, true);
    return;
  }

  if (!recognition) {
    recognition = setupSpeechRecognition();
  }

  if (recognition) {
    if (recognition._isRunning) {
      recognition.stop();
      updateRecognitionStatus('Microphone off');
      if (window.voiceBtn) window.voiceBtn.textContent = '🎤';
    } else {
      try {
        recognition.start();
        updateRecognitionStatus('Listening...');
        if (window.voiceBtn) window.voiceBtn.textContent = '🎤 Active';
      } catch(e) {
        console.error('Error starting recognition:', e);
        addMessage('❌ Failed to start microphone', false, true);
      }
    }
  }
}

// Update weather display with caching
function updateWeatherDisplay(weather) {
  if (!weather) return;
  
  // Cache the weather data
  weatherCache.data = weather;
  weatherCache.timestamp = Date.now();
  
  currentWeather = weather;
  
  // Get the existing weather info element
  if (!window.weatherInfo) {
    window.weatherInfo = document.getElementById('weather-info');
  }
  
  if (window.weatherInfo) {
    // Update time and weather
    const time = new Date().toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    window.weatherInfo.innerHTML = `${time} | ${weather.city}: ${weather.temp}°C, ${weather.description}`;
    window.weatherWidget.classList.add('active');
  } else {
    console.error('Weather info element not found');
  }
}

// Get weather with caching
async function getWeather() {
  // Check cache first
  if (weatherCache.data && (Date.now() - weatherCache.timestamp < weatherCache.expiry)) {
    updateWeatherDisplay(weatherCache.data);
    return weatherCache.data;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.WEATHER}?latitude=${CONFIG.DEFAULT_LAT}&longitude=${CONFIG.DEFAULT_LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Convert weather code to description
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    const weather = {
      city: CONFIG.DEFAULT_CITY,
      temp: Math.round(data.current.temperature_2m),
      description: weatherCodes[data.current.weather_code] || 'Unknown',
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      icon: data.current.weather_code
    };
    
    if (weather && weather.city) {
      updateWeatherDisplay(weather);
      return weather;
    } else {
      throw new Error('Invalid weather data received');
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Return cached data if available, even if expired
    if (weatherCache.data) {
      updateWeatherDisplay(weatherCache.data);
      return weatherCache.data;
    }
    return null;
  }
}

// Get time with caching
async function getTime() {
  // Check cache first
  if (timeCache.data && (Date.now() - timeCache.timestamp < timeCache.expiry)) {
    return timeCache.data;
  }
  
  try {
    // Use local time instead of API
    const now = new Date();
    timeCache.data = {
      datetime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    timeCache.timestamp = Date.now();
    return timeCache.data;
  } catch (error) {
    console.error('Error getting time:', error);
    // Fallback to local time
    const now = new Date();
    return {
      datetime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

// Update time display
async function updateTimeDisplay() {
  try {
    const timeData = await getTime();
    const time = new Date(timeData.datetime).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    if (window.weatherInfo && currentWeather) {
      window.weatherInfo.innerHTML = `${time} | ${currentWeather.city}: ${currentWeather.temp}°C, ${currentWeather.description}`;
    }
  } catch (error) {
    console.error('Error updating time display:', error);
  }
}

// Start time updates
setInterval(updateTimeDisplay, 60000); // Update every minute
updateTimeDisplay(); // Initial update

// Initialize weather
async function initWeather() {
  try {
    const weather = await getWeather();
    if (weather) {
      console.log('🌤️ Weather systems online');
    } else {
      console.warn('⚠️ Weather data not available');
    }
  } catch (error) {
    console.error('Weather initialization error:', error);
  }
}

console.log('🌌 KIKO MATRIX main systems loaded. Quantum initialization pending...');

// Add microphone restart button
function addRestartMicButton() {
  const micButton = document.createElement('button');
  micButton.id = 'restart-mic-btn';
  micButton.innerHTML = '🔄 Restart Microphone';
  micButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    display: none;
  `;
  
  micButton.addEventListener('click', () => {
    if (recognition) {
      try {
        recognition.stop();
        setTimeout(() => {
          recognition.start();
          updateRecognitionStatus('Listening...');
          micButton.style.display = 'none';
        }, 1000);
      } catch (e) {
        console.error('Error restarting microphone:', e);
      }
    }
  });
  
  document.body.appendChild(micButton);
  
  // Show button if recognition fails
  window.addEventListener('error', (e) => {
    if (e.message.includes('recognition') || e.message.includes('microphone')) {
      micButton.style.display = 'block';
    }
  });
}