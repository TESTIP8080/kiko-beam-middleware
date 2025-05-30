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

// Enhanced topic suggestions with context awareness
suggestTopics = function() {
  if (processingMessage || isSpeaking) return;
  
  // Don't suggest during active hyperjump
  if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) return;
  
  const contextualSuggestions = {
    morning: [
      "🌅 Good morning! Ready for some energizing music to start your day?",
      "☀️ Morning! How about checking the weather or watching some news?",
      "🚀 Ready for a great day! Want to test the hyperjump system or watch something motivating?",
      "🎵 Morning energy boost! Try 'upbeat morning music' or 'coffee shop ambience'"
    ],
    afternoon: [
      "🌤️ How's your day going? Want to watch something relaxing or uplifting?",
      "⚡ Need a break? I can play music, funny videos, or we could try a hyperjump call!",
      "🎯 Afternoon! Time for entertainment? Just name any artist, topic, or say 'teleport kiko'!",
      "🎪 Midday entertainment! Try 'productivity music' or 'interesting documentaries'"
    ],
    evening: [
      "🌆 Evening! Ready to unwind with videos, music, or a hyperjump adventure?",
      "🎬 How about some relaxing content? Movies, music, or ambient sounds?",
      "🌙 Want to watch something before bed? Comedy, nature sounds, or call a friend?",
      "✨ Evening vibes! Try 'chill music' or 'beautiful nature videos'"
    ],
    night: [
      "🌙 Late night session! Want some ambient music or relaxing content?",
      "⭐ Night owl mode! Try 'lo-fi music' or 'sleep sounds'",
      "🌃 Nighttime exploration! Want to test hyperjump to other time zones?",
      "💫 Peaceful night! Try 'meditation music' or 'rain sounds'"
    ]
  };
  
  // Determine time of day
  const hour = new Date().getHours();
  let timeCategory = 'default';
  if (hour >= 5 && hour < 12) timeCategory = 'morning';
  else if (hour >= 12 && hour < 17) timeCategory = 'afternoon';
  else if (hour >= 17 && hour < 22) timeCategory = 'evening';
  else timeCategory = 'night';
  
  let suggestion;
  
  // Context-aware suggestions
  if (window.kikoWebRTC && !window.kikoWebRTC.callInProgress && timeCategory !== 'night') {
    const hyperjumpSuggestions = [
      "🚀 Want to try the hyperjump system? Say 'teleport kiko' for a demo!",
      "🌌 The quantum network is ready! Try 'show contacts' or 'teleport kiko'",
      "⚡ Hyperjump systems online! Ready to connect across space-time?",
      "🛸 Feel like exploring? Say 'teleport kiko' or add new contacts!"
    ];
    
    if (Math.random() < 0.3) { // 30% chance for hyperjump suggestion
      suggestion = hyperjumpSuggestions[Math.floor(Math.random() * hyperjumpSuggestions.length)];
    }
  }
  
  // Video content suggestions based on history
  if (!suggestion && lastYouTubeQuery && userPreferences.watchHistory.length > 0) {
    const recentTopics = [...new Set(userPreferences.watchHistory.slice(-5))];
    const suggestions = [
      `🎵 Want more "${lastYouTubeQuery}" videos?`,
      `🎬 How about something different from "${lastYouTubeQuery}"?`,
      `🌟 Based on your history, try "${recentTopics[Math.floor(Math.random() * recentTopics.length)]}"`,
      `⏭️ Say 'next' for another "${lastYouTubeQuery}" video!`,
      `🎯 You might enjoy: ${userPreferences.favoriteTopics.slice(-3).join(', ')}`
    ];
    suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
  }
  
  // Fallback to time-based suggestions
  if (!suggestion) {
    const categorysuggestions = contextualSuggestions[timeCategory] || [
      "🎤 I'm here! Just say any artist name like 'Drake' or 'Taylor Swift'",
      "🎬 Want entertainment? Say 'funny videos' or 'music' or any topic!",
      "🎵 Try saying 'Michael Jackson' or 'cute cats' or 'UFC fights'!",
      "🚀 I can play ANY video or start hyperjump calls! Tell me what interests you.",
      "😴 Feeling bored? Say 'something interesting' or 'call KiKo 2' for adventure!"
    ];
    suggestion = categorysuggestions[Math.floor(Math.random() * categorysuggestions.length)];
  }
  
  addMessage(suggestion);
  
  // Update interaction timestamp
  userPreferences.lastInteractionSuggestion = Date.now();
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

console.log('🌌 KIKO MATRIX main systems loaded. Quantum initialization pending...');