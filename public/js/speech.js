// js/speech.js - Speech recognition and synthesis

// Utility functions
function stripEmojis(text) {
  // Remove all emojis and special characters that cause speech issues
  const cleanText = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // Emoticons
    .replace(/[\u{2600}-\u{27FF}]/gu, '') // Miscellaneous Symbols
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '') // Miscellaneous Symbols and Arrows
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Miscellaneous Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{E0100}-\u{E01EF}]/gu, '') // Variation Selectors Supplement
    .replace(/[🌟✨🎉🎊🎈🎁💫⭐️☀️🌈❤️💕💖💗💝🔥⚡️✅❌⚠️📍🎯🎪🎭🎨🎬🎮🎵🎶🎸🥁🎹🎺🎻🎤🎧📱💻🖥️⌨️🖱️💾💿📀]/gu, '')
    .replace(/[:;]-?[)D(PpOo]/g, '') // Text emoticons
    .trim();
  
  return cleanText;
}

// Speech queue management
function addToSpeechQueue(text) {
  const speechId = ++currentSpeechId;
  speechQueue.push({ id: speechId, text: text });
  
  if (!isSpeaking) {
    processSpeechQueue();
  }
}

function processSpeechQueue() {
  if (speechQueue.length === 0 || isSpeaking) return;
  
  const nextSpeech = speechQueue.shift();
  speakResponse(nextSpeech.text, nextSpeech.id);
}

function clearSpeechQueue() {
  speechQueue = [];
  stopSpeech();
}

function stopSpeech() {
  if (currentSpeechSynthesis) {
    window.speechSynthesis.cancel();
    currentSpeechSynthesis = null;
  }
  isSpeaking = false;
  
  setTimeout(() => {
    processSpeechQueue();
  }, 100);
}

// Activate speech synthesis
function activateSpeechSynthesis() {
  if (!speechActivated && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0.1;
    window.speechSynthesis.speak(utterance);
    speechActivated = true;
  }
}

// Speak response with queue support
function speakResponse(text, speechId = null) {
  hideThinking();
  
  if (isSpeaking) {
    stopSpeech();
  }
  
  if (!('speechSynthesis' in window)) {
    setTimeout(() => processSpeechQueue(), 100);
    return;
  }
  
  try {
    // STOP recognition during speech to avoid self-listening
    let recognitionWasRunning = false;
    if (recognition && recognition._isRunning) {
      recognition.stop();
      recognitionWasRunning = true;
    }
    
    const cleanText = stripEmojis(text);
    console.log("Speaking text:", cleanText);
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1.2;
    utterance.volume = 0.9; // Slightly lower volume to help with recognition
    
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }
    
    isSpeaking = true;
    updateRecognitionStatus('Speaking...');
    
    utterance.onend = () => { 
      isSpeaking = false;
      updateRecognitionStatus('Ready to listen');
      
      // Restart recognition after speaking
      if (recognitionWasRunning && recognition && !recognition._manualStop) {
        setTimeout(() => {
          try {
            recognition.start();
            updateRecognitionStatus('Listening...');
          } catch(e) {
            console.error("Error restarting after speech:", e);
          }
        }, 300);
      }
      
      setTimeout(() => {
        processSpeechQueue();
      }, 200);
    };
    
    utterance.onerror = () => {
      isSpeaking = false;
      updateRecognitionStatus('Speech error');
      
      // Restart recognition on error
      if (recognitionWasRunning && recognition && !recognition._manualStop) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch(e) {
            console.error("Error restarting after speech error:", e);
          }
        }, 300);
      }
      
      setTimeout(() => processSpeechQueue(), 100);
    };
    
    currentSpeechSynthesis = utterance;
    window.speechSynthesis.speak(utterance);
  } catch(err) {
    console.error('Speech synthesis error:', err);
    isSpeaking = false;
    updateRecognitionStatus('Speech error');
    setTimeout(() => processSpeechQueue(), 100);
  }
}

// Setup speech recognition
function setupSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !window.GoogleSpeechRecognition) {
    addMessage('Browser does not support speech recognition', false, true);
    if (window.voiceBtn) window.voiceBtn.disabled = true; 
    return null;
  }
  
  // Try to use GoogleSpeechRecognition first, fallback to webkitSpeechRecognition
  let rec;
  if (window.GoogleSpeechRecognition) {
    rec = new GoogleSpeechRecognition({
      middleware_url: window.location.origin,
      language: 'en-US',
      volumeMeter: (level) => {
        if (window.volumeLevel) {
          window.volumeLevel.style.width = level + '%';
        }
      }
    });
  } else {
    rec = new webkitSpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;
  }
  
  // Additional properties
  rec._isRunning = false;
  rec._manualStop = false;
  rec._tempStop = false;
  rec._wasStarted = false;
  rec._completeCommand = '';
  rec._intermediateTexts = [];
  rec._processingTimeout = null;
  
  function updateVisualStatus(isRunning) {
    if (window.listeningIndicator) window.listeningIndicator.style.display = isRunning ? 'block' : 'none';
    if (window.voiceBtn) window.voiceBtn.classList.toggle('active', isRunning);
    
    if (isRunning) {
      if (window.voiceBtn) window.voiceBtn.textContent = '🎤 Active';
      updateRecognitionStatus('Listening...');
    } else {
      if (window.voiceBtn) window.voiceBtn.textContent = '🎤';
      updateRecognitionStatus('Microphone off');
    }
  }

  rec.onstart = () => {
    rec._isRunning = true;
    updateVisualStatus(true);
    
    rec._completeCommand = '';
    rec._intermediateTexts = [];
    
    if (window.volumeMeter) {
      window.volumeMeter.style.display = 'block';
      if (window.volumeLevel) window.volumeLevel.style.width = '0%';
    }
    
    activateSpeechSynthesis();
    setupVolumeMeter();
    
    if (!rec._wasStarted) {
      addMessage('🎤 Speech recognition activated. I\'m listening.', false, false, true); 
      rec._wasStarted = true;
    }
    
    if (restartRecognitionTimer) {
      clearTimeout(restartRecognitionTimer);
      restartRecognitionTimer = null;
    }
  };
  
  rec.onend = () => {
    rec._isRunning = false;
    updateVisualStatus(false);
    
    if (window.volumeMeter) {
      window.volumeMeter.style.display = 'none';
    }
    
    console.log("Recognition stopped", 
              "manual:", rec._manualStop, 
              "temp:", rec._tempStop,
              "speaking:", isSpeaking);
    
    // Auto-restart
    if (!rec._manualStop && !isSpeaking && !processingMessage) {
      const delay = rec._tempStop ? 800 : 600;
      
      restartRecognitionTimer = setTimeout(() => {
        if (!rec._isRunning && !rec._manualStop && !isSpeaking) {
          console.log("Auto-restarting microphone");
          try {
            rec.start();
          } catch(err) {
            console.error('Error restarting:', err);
            setTimeout(() => {
              try { 
                rec.start(); 
              } catch(err2) { 
                console.error("Repeated error:", err2);
                updateRecognitionStatus('Ошибка распознавания');
              }
            }, 1000);
          }
        }
      }, delay);
    }
    
    rec._tempStop = false;
  };

  rec.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      addMessage('❌ Microphone access denied! Please allow access in browser settings.', false, true);
      updateRecognitionStatus('No microphone access');
    } else if (event.error === 'no-speech') {
      // Silently handle no-speech errors - this is normal in continuous listening
      updateRecognitionStatus('Listening...');
    } else if (event.error === 'audio-capture') {
      updateRecognitionStatus('Audio capture problem');
    } else if (event.error === 'network') {
      updateRecognitionStatus('Network error');
    } else {
      updateRecognitionStatus('Recognition error');
    }
    
    // Restart for specific errors
    if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
      if (!rec._manualStop) {
        setTimeout(() => {
          try {
            if (!rec._isRunning) {
              rec.start();
            }
          } catch(e) {
            console.error(`Error restarting after ${event.error}:`, e);
          }
        }, 100);
      }
    }
  };

  // Process recognition results
  rec.onresult = async (event) => {
    // If user speaks while AI is speaking, stop AI speech
    if (isSpeaking && event.results[event.results.length - 1][0].transcript.trim().length > 3) {
      console.log("User interruption detected");
      stopSpeech();
      clearSpeechQueue();
    }
    
    // Continue listening even when speaking
    if (processingMessage) return;
    
    const result = event.results[event.results.length - 1];
    
    let bestText = '';
    let highestConfidence = 0;
    
    for (let i = 0; i < result.length; i++) {
      if (result[i].confidence > highestConfidence) {
        highestConfidence = result[i].confidence;
        bestText = result[i].transcript.trim();
      }
    }
    
    if (bestText.length > 0) {
      updateRecognitionStatus('Heard: ' + bestText.substring(0, 30) + '...');
    }
    
    if (result.isFinal) {
      clearTimeout(rec._processingTimeout);
      rec._completeCommand = bestText;
      
      const lower = bestText.toLowerCase();
      const isComplexCommand = lower.includes('video') || 
                             lower.includes('youtube') || 
                             lower.includes('show') ||
                             lower.includes('find') ||
                             lower.includes('weather') ||
                             lower.includes('teleport') ||
                             lower.includes('contact') ||
                             lower.includes('call');
      
      rec._processingTimeout = setTimeout(() => {
        if (!processingMessage && rec._completeCommand && rec._completeCommand.length > 2) {
          processingMessage = true;
          resetSilenceTimer(); // Reset silence timer on voice input
          
          const finalCommand = rec._completeCommand;
          rec._completeCommand = '';
          rec._intermediateTexts = [];
          
          console.log('🎙️ Processing voice command:', finalCommand);
          addMessage(finalCommand, true);
          showThinking();
          
          // Don't stop microphone, just process command
          processCommand(finalCommand).finally(() => {
            processingMessage = false;
          });
        }
      }, isComplexCommand ? 1000 : 400);
      
    } else {
      if (bestText.length > 5) {
        rec._intermediateTexts.push(bestText);
        
        if (highestConfidence > 0.7 && bestText.length > 8) {
          rec._completeCommand = bestText;
        }
        
        clearTimeout(rec._processingTimeout);
        
        rec._processingTimeout = setTimeout(() => {
          if (!processingMessage && rec._completeCommand && rec._completeCommand.length > 5) {
            processingMessage = true;
            
            let bestCommand = rec._completeCommand;
            if (rec._intermediateTexts.length > 0) {
              const longestText = rec._intermediateTexts.reduce((a, b) => 
                a.length > b.length ? a : b, '');
              if (longestText.length > bestCommand.length) {
                bestCommand = longestText;
              }
            }
            
            rec._completeCommand = '';
            rec._intermediateTexts = [];
            
            console.log('🎙️ Processing interim command:', bestCommand);
            addMessage(bestCommand, true);
            showThinking();
            
            // Don't stop microphone, just process command
            processCommand(bestCommand).finally(() => {
              processingMessage = false;
            });
          }
        }, 2000);
      }
    }
  };
  
  return rec;
}

// Volume meter setup
function setupVolumeMeter() {
  if (audioContext) return;
  
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioStream = stream;
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          
          if (!analyser) {
            console.error('Could not create audio analyzer');
            return;
          }
          
          microphone = audioContext.createMediaStreamSource(stream);
          
          analyser.smoothingTimeConstant = 0.8;
          analyser.fftSize = 1024;
          
          microphone.connect(analyser);
          
          const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
          analyser.connect(scriptProcessor);
          scriptProcessor.connect(audioContext.destination);
          
          scriptProcessor.onaudioprocess = () => {
            if (!analyser) return;
            
            try {
              const array = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(array);
              const values = array.reduce((a, b) => a + b, 0) / array.length;
              
              if (volumeLevel) {
                volumeLevel.style.width = Math.min(values * 2, 100) + '%';
              }
            } catch (e) {
              console.error('Error processing audio:', e);
            }
          };
        })
        .catch(err => {
          console.error('Error accessing microphone for volume meter:', err);
        });
    }
  } catch (e) {
    console.error('Error initializing volume meter:', e);
  }
}

// Cleanup audio resources
function cleanupAudioResources() {
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  if (audioContext) {
    audioContext.close().catch(e => console.error('Error closing audio context:', e));
    audioContext = null;
  }
  analyser = null;
  microphone = null;
}

// Handle speech error
function handleSpeechError(error) {
  console.error('Speech recognition error:', error);
  
  // Don't restart if manually stopped or during speaking
  if (recognition._manualStop || isSpeaking) {
    return;
  }
  
  // Add delay before restarting
  setTimeout(() => {
    if (recognition && !recognition._isRunning && !recognition._manualStop) {
      try {
        recognition.start();
        updateRecognitionStatus('Listening...');
      } catch(e) {
        console.error('Error restarting after speech error:', e);
        // Show restart button if error persists
        const restartBtn = document.getElementById('restart-mic-btn');
        if (restartBtn) {
          restartBtn.style.display = 'block';
        }
      }
    }
  }, 1000);
}

// Update voice button state
function updateVoiceButtonState() {
  if (!window.voiceBtn) return;
  
  if (recognition && recognition._isRunning) {
    window.voiceBtn.textContent = '🎤 Active';
    window.voiceBtn.style.background = 'rgba(0, 255, 0, 0.2)';
  } else {
    window.voiceBtn.textContent = '🎤';
    window.voiceBtn.style.background = '';
  }
}

// Toggle voice input
function toggleVoiceInput() {
  if (!recognition) {
    recognition = setupSpeechRecognition();
  }

  if (recognition) {
    if (recognition._isRunning) {
      recognition.stop();
      updateRecognitionStatus('Microphone off');
      updateVoiceButtonState();
    } else {
      try {
        recognition.start();
        updateRecognitionStatus('Listening...');
        updateVoiceButtonState();
      } catch(e) {
        console.error('Error starting recognition:', e);
        addMessage('❌ Failed to start microphone', false, true);
      }
    }
  }
}

// After 5 seconds stop recording and send data
// for continuous operation with long phrases
this.recordingTimeout = setTimeout(() => {
  if (this._isRunning && !this._manualStop && !this._tempStop) {
    // Check if we have enough silence to consider phrase complete
    const silenceThreshold = 1.5; // seconds of silence
    let silenceStart = null;
    
    const checkSilence = () => {
      if (!this._isRunning || this._manualStop || this._tempStop) return;
      
      const currentVolume = this.volumeMeter();
      if (currentVolume < 10) { // Low volume threshold
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > silenceThreshold * 1000) {
          this._tempStop = true;
          this.stopRecordingAndProcess();
          return;
        }
      } else {
        silenceStart = null;
      }
      
      setTimeout(checkSilence, 100);
    };
    
    checkSilence();
  }
}, 10000); // Increased from 5000 to 10000 ms