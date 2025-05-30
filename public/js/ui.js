// js/ui.js - UI management functions

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  window.chatContainer = document.getElementById('chat-container');
  window.userInput = document.getElementById('user-input');
  window.sendBtn = document.getElementById('send-btn');
  window.voiceBtn = document.getElementById('voice-btn');
  window.listeningIndicator = document.getElementById('listening-indicator');
  window.volumeMeter = document.getElementById('volume-meter');
  window.volumeLevel = document.getElementById('volume-level');
  window.recognitionStatus = document.getElementById('recognition-status');
  window.mediaPanel = document.getElementById('media-panel');
  window.dialogStateEl = document.getElementById('dialog-state');
  window.dialogStateText = document.getElementById('dialog-state-text');

  window.cameraArea = document.getElementById('camera-area');
  window.cameraPreview = document.getElementById('camera-preview');
  window.cameraBtn = document.getElementById('camera-btn');
  window.cameraContainer = document.getElementById('camera-container');

  window.videoArea = document.getElementById('video-area');
  window.videoIframe = document.getElementById('youtube-iframe');
  window.youtubePlayBtn = document.getElementById('youtube-play');
  window.youtubeSearchBtn = document.getElementById('youtube-search');
  window.youtubeContainer = document.getElementById('youtube-container');

  // Teleport elements
  window.teleportArea = document.getElementById('teleport-area');
  window.closeTeleportBtn = document.getElementById('close-teleport-btn');
  window.jitsiContainer = document.getElementById('jitsi-container');
  window.teleportAnimation = document.getElementById('teleport-animation');

  // Weather elements
  window.weatherWidget = document.getElementById('weather-widget');
  window.weatherInfo = document.getElementById('weather-info');
});

// Update dialog state UI
function updateDialogState(state) {
  currentDialogState = state;
  if (window.dialogStateEl) window.dialogStateEl.classList.add('active');
  
  const stateTexts = {
    [DialogState.IDLE]: 'Ready',
    [DialogState.WAITING_VIDEO_TOPIC]: 'Waiting for video topic',
    [DialogState.WAITING_CONFIRMATION]: 'Waiting for confirmation',
    [DialogState.CLARIFYING]: 'Clarifying details',
    [DialogState.PROCESSING]: 'Processing...'
  };
  
  if (window.dialogStateText) window.dialogStateText.textContent = stateTexts[state] || 'Active';
  
  // Hide after 3 seconds if IDLE
  if (state === DialogState.IDLE) {
    setTimeout(() => {
      if (currentDialogState === DialogState.IDLE && window.dialogStateEl) {
        window.dialogStateEl.classList.remove('active');
      }
    }, 3000);
  }
}

// Add message to chat
function addMessage(text, isUser = false, isError = false, isSystem = false) {
  if (!window.chatContainer) {
    console.error('Chat container not ready');
    return;
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  
  if (isError) {
    messageDiv.classList.add('error-message');
  } else if (isSystem) {
    messageDiv.classList.add('system-message');
  } else {
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
  }
  
  messageDiv.textContent = text;
  window.chatContainer.appendChild(messageDiv);
  window.chatContainer.scrollTop = window.chatContainer.scrollHeight;
  
  // Add to speech queue (text will be cleaned by speakResponse)
  if (!isUser && !isError && !isSystem) {
    addToSpeechQueue(text);
  }
  
  return messageDiv;
}

// Show thinking indicator
function showThinking() {
  hideThinking();
  thinkingMessageDiv = document.createElement('div');
  thinkingMessageDiv.classList.add('message', 'thinking-message');
  thinkingMessageDiv.textContent = 'Думаю...';
  chatContainer.appendChild(thinkingMessageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Hide thinking indicator
function hideThinking() {
  if (thinkingMessageDiv && thinkingMessageDiv.parentNode) {
    thinkingMessageDiv.parentNode.removeChild(thinkingMessageDiv);
  }
  thinkingMessageDiv = null;
}

// Update recognition status
function updateRecognitionStatus(status) {
  if (window.recognitionStatus) {
    window.recognitionStatus.textContent = status;
  }
  
  if (status === 'Listening...' && recognition && recognition._isRunning) {
    if (window.voiceBtn) window.voiceBtn.textContent = '🎤 Active';
  } else if (status === 'Microphone off') {
    if (window.voiceBtn) window.voiceBtn.textContent = '🎤';
  }
}

// Toggle media panel
function toggleMediaPanel(show = true) {
  if (show) {
    mediaPanel.classList.add('active');
  } else {
    if (!isCameraActive && youtubePlayerState === 'stopped') {
      mediaPanel.classList.remove('active');
    }
  }
}

// Weather display
function updateWeatherDisplay(weather) {
  if (!weather) return;
  
  currentWeather = weather;
  weatherInfo.innerHTML = `${weather.city}: ${weather.temp}°C, ${weather.description}`;
  weatherWidget.classList.add('active');
}

function showWeatherInChat() {
  if (currentWeather) {
    let weatherText = `Current weather in ${currentWeather.city}: ${currentWeather.temp} degrees Celsius, ${currentWeather.description}`;
    if (currentWeather.humidity) {
      weatherText += `. Humidity: ${currentWeather.humidity} percent, Wind: ${currentWeather.windSpeed} meters per second`;
    }
    addMessage(weatherText);
  } else {
    addMessage('Weather information unavailable. Let me check...');
    initWeather().then(() => {
      if (currentWeather) {
        showWeatherInChat();
      }
    });
  }
}

// Add restart microphone button
function addRestartMicButton() {
  if (document.getElementById('restart-mic-btn')) return;
  
  const restartBtn = document.createElement('button');
  restartBtn.id = 'restart-mic-btn';
  restartBtn.textContent = '🔄';
  restartBtn.title = 'Restart microphone';
  restartBtn.style.marginLeft = '5px';
  
  restartBtn.addEventListener('click', () => {
    if (recognition) {
      if (recognition._isRunning) {
        recognition.stop();
      }
      recognition = null;
    }
    
    cleanupAudioResources();
    
    setTimeout(() => {
      recognition = setupSpeechRecognition();
      if (recognition) {
        try {
          recognition.start();
          addMessage('🔄 Microphone restarted', false, false, true);
        } catch(e) {
          console.error('Error restarting:', e);
          addMessage('❌ Failed to restart microphone', false, true);
        }
      }
    }, 500);
  });
  
  document.getElementById('input-container').appendChild(restartBtn);
}

// Android TV optimization
function initForTV() {
  document.documentElement.style.fontSize = '24px';
  const style = document.createElement('style');
  style.textContent = `
    button:hover { transform: none !important; opacity: 1 !important; }
    #send-btn, #voice-btn { padding: 15px 30px; font-size: 1.2em; }
    #user-input { font-size: 1.2em; padding: 15px; }
  `;
  document.head.appendChild(style);
  document.querySelectorAll('button').forEach(btn => btn.setAttribute('tabindex', '0'));
  userInput.setAttribute('tabindex', '0');
}