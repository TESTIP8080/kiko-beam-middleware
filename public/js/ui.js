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

  addStarsToChat();
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
  
  // Обрезаем длинные ответы ассистента
  if (!isUser && !isError && !isSystem) {
    const sentences = text.split(/[.!?]\s/);
    text = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
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
  thinkingMessageDiv.textContent = 'Thinking...';
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
    if (window.voiceBtn) {
      window.voiceBtn.textContent = '🎤 Active';
      window.voiceBtn.disabled = false;
    }
  } else if (status === 'Microphone off') {
    if (window.voiceBtn) {
      window.voiceBtn.textContent = '🎤';
      window.voiceBtn.disabled = true;
    }
  }
}

// Toggle media panel
function toggleMediaPanel(show = true) {
    const chatPanel = document.querySelector('.chat-panel');
    const mediaPanel = document.querySelector('.media-panel');
    
    if (show) {
        mediaPanel.classList.add('active');
        chatPanel.classList.add('with-media');
    } else {
        if (!isCameraActive && youtubePlayerState === 'stopped') {
            mediaPanel.classList.remove('active');
            chatPanel.classList.remove('with-media');
        }
    }
}

// Update media panel layout
function updateMediaLayout() {
    const mediaPanel = document.querySelector('.media-panel');
    const cameraContainer = document.getElementById('camera-container');
    const youtubeContainer = document.getElementById('youtube-container');
    
    if (isCameraActive && youtubePlayerState !== 'stopped') {
        mediaPanel.classList.add('double-media');
        cameraContainer.style.display = 'flex';
        youtubeContainer.style.display = 'flex';
    } else if (isCameraActive) {
        mediaPanel.classList.remove('double-media');
        cameraContainer.style.display = 'flex';
        youtubeContainer.style.display = 'none';
    } else if (youtubePlayerState !== 'stopped') {
        mediaPanel.classList.remove('double-media');
        cameraContainer.style.display = 'none';
        youtubeContainer.style.display = 'flex';
    } else {
        mediaPanel.classList.remove('active');
        document.querySelector('.chat-panel').classList.remove('with-media');
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

// Starry background
function createStar(container = 'particles-container') {
    const star = document.createElement('div');
    star.className = 'particle';
    
    // Random position
    const x = Math.random() * window.innerWidth;
    const y = -20; // Start from top
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    
    // Random horizontal movement
    const xOffset = (Math.random() - 0.5) * 200; // Random horizontal drift
    star.style.setProperty('--x', xOffset + 'px');
    
    document.getElementById(container).appendChild(star);
    setTimeout(() => star.remove(), 50000); // Match with longest animation duration
}

// Create initial stars
for (let i = 0; i < 100; i++) {
    createStar();
}

// Continue creating stars
setInterval(createStar, 500);

// Add stars to chat container
function addStarsToChat() {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
    // Create particles container for chat if it doesn't exist
    let chatParticles = document.getElementById('chat-particles');
    if (!chatParticles) {
        chatParticles = document.createElement('div');
        chatParticles.id = 'chat-particles';
        chatParticles.style.position = 'absolute';
        chatParticles.style.top = '0';
        chatParticles.style.left = '0';
        chatParticles.style.right = '0';
        chatParticles.style.bottom = '0';
        chatParticles.style.pointerEvents = 'none';
        chatParticles.style.zIndex = '0';
        chatParticles.style.overflow = 'hidden';
        chatContainer.style.position = 'relative';
        chatContainer.appendChild(chatParticles);
    }
    
    // Create stars in chat
    for (let i = 0; i < 50; i++) {
        createStar('chat-particles');
    }
    
    // Continue creating stars in chat
    setInterval(() => createStar('chat-particles'), 500);
}

// Emoji rain
const emojis = ['🎉', '🎈', '🎊', '⭐', '✨', '🌟', '💫', '🎯', '🎮', '🍿', '🍕', '🍰'];

function createEmojiRain() {
    const emoji = document.createElement('div');
    emoji.className = 'emoji-rain';
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.left = Math.random() * 100 + '%';
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 5000);
}

// Add emoji rain to message sending
const originalAddMessage = addMessage;
addMessage = function(message, type) {
    originalAddMessage(message, type);
    if (type === 'user') {
        for (let i = 0; i < 5; i++) {
            setTimeout(createEmojiRain, i * 100);
        }
    }
};