// js/commands.js - Smart Command Processing

// Process command from user
async function processCommand(text) {
  const lower = text.toLowerCase();
  lastCommand = lower;
  
  // Reset silence timer on any command
  resetSilenceTimer();
  
  // Helper function for video search with confirmation
  async function searchVideoWithConfirmation(query) {
    clearSpeechQueue();
    addMessage(`I'll search for "${query}" on YouTube...`);
    const yt = await searchYouTube(query);
    if (yt) {
      lastYouTubeUrl = yt;
      lastYouTubeQuery = query;
      playVideo(yt);
      addMessage(`Now playing: "${query}"`);
    } else {
      addMessage(`Sorry, I couldn't find videos about "${query}". Try different keywords?`);
    }
  }
  
  // Priority 1: Direct commands (hyperjump, camera, etc.)
  if (processDirectCommands(text)) {
    hideThinking();
    return;
  }
  
  // Priority 2: Handle dialog states
  if (currentDialogState === DialogState.WAITING_VIDEO_TOPIC) {
    currentDialogState = DialogState.IDLE;
    hideThinking();
    
    // User provided video topic
    await searchVideoWithConfirmation(text);
    updateDialogState(DialogState.IDLE);
    return;
  }
  
  // Priority 3: Analyze if user wants videos or information
  const wantsVideo = analyzeVideoIntent(text);
  const isQuestion = analyzeQuestionIntent(text);
  
  // Priority 4: Direct video/music requests
  if (wantsVideo) {
    hideThinking();
    
    // Extract what to search
    const searchTopic = extractVideoTopic(text);
    
    if (searchTopic && searchTopic.length > 2) {
      await searchVideoWithConfirmation(searchTopic);
    } else {
      // Ask what they want to watch
      currentDialogState = DialogState.WAITING_VIDEO_TOPIC;
      updateDialogState(DialogState.WAITING_VIDEO_TOPIC);
      addMessage("What would you like to watch? Just tell me the topic, song, or artist!");
    }
    return;
  }
  
  // Priority 5: Information questions - let AI answer without searching videos
  if (isQuestion && !wantsVideo) {
    // Let Gemini handle this as a conversation
    const response = await getGeminiResponse(text);
    hideThinking();
    addMessage(response);
    chatHistory.push({role: 'assistant', content: response});
    
    // Only analyze for actions if AI suggests them
    await analyzeAIResponse(response, text);
    updateDialogState(DialogState.IDLE);
    return;
  }
  
  // Priority 6: Everything else goes to AI
  const response = await getGeminiResponse(text);
  hideThinking();
  addMessage(response);
  chatHistory.push({role: 'assistant', content: response});
  
  // Analyze AI response for suggested actions
  await analyzeAIResponse(response, text);
  updateDialogState(DialogState.IDLE);
}

// Process direct commands that bypass AI
function processDirectCommands(text) {
  const lower = text.toLowerCase();
  
  // Hyperjump commands
  if (processHyperjumpCommands(text)) {
    return true;
  }
  
  // Camera commands
  if (processCameraCommands(text)) {
    return true;
  }
  
  // Weather command
  if (lower === 'weather' || lower === 'show weather') {
    showWeatherInChat();
    updateDialogState(DialogState.IDLE);
    return true;
  }
  
  // Stop/interrupt commands
  const interruptCommands = ['stop', 'wait', 'pause', 'quiet', 'silence'];
  if (interruptCommands.includes(lower)) {
    stopSpeech();
    clearSpeechQueue();
    addMessage('Okay, I stopped.');
    updateDialogState(DialogState.IDLE);
    return true;
  }
  
  // YouTube control commands
  if (processYouTubeControls(text)) {
    return true;
  }
  
  // Обработка команды звонка
  if (text.toLowerCase().includes('teleport kiko')) {
    console.log('🤖 Initiating KiKo 2 demo hyperjump...');
    
    // Use the WebRTC system for the call
    if (window.kikoWebRTC) {
      startTeleportCall(DAILY_CONFIG.defaultRoom, 'KiKo 2', true);
      addMessage('🌌 Initiating hyperjump to KiKo 2...', false, false, true);
    } else {
      addMessage('⚠️ Hyperjump system offline. Please reload the page.', false, true);
    }
    
    return true;
  }
  
  return false;
}

// Process hyperjump/call commands
function processHyperjumpCommands(text) {
  const lower = text.toLowerCase();
  
  // Direct KiKo 2 calls
  const kiko2Patterns = [
    'teleport kiko', 'kiko', 'hyperjump to kiko', 
    'connect to kiko', 'demo call', 'test call'
  ];
  
  for (const pattern of kiko2Patterns) {
    if (lower.includes(pattern)) {
      startTeleportCall(DAILY_CONFIG.defaultRoom, 'KiKo 2', true);
      return true;
    }
  }
  
  // Generic call commands
  if (lower.includes('call ') || lower.includes('hyperjump to ')) {
    const match = text.match(/(?:call|hyperjump to) (.+)/i);
    if (match && match[1]) {
      const contactName = match[1].trim();
      voiceTeleportToContact(contactName);
      return true;
    }
  }
  
  // Contact management
  if (lower === 'show contacts' || lower === 'contacts' || lower === 'contact list') {
    showContactList();
    return true;
  }
  
  if (lower === 'end call' || lower === 'hang up') {
    if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
      window.kikoWebRTC.endCall();
      addMessage('📞 Call ended');
    } else {
      addMessage('No active call');
    }
    return true;
  }
  
  return false;
}

// Process camera commands
function processCameraCommands(text) {
  const lower = text.toLowerCase();
  
  const photoCommands = ['take photo', 'take a photo', 'photo', 'picture', 'selfie', 'capture'];
  const cameraOn = ['turn on camera', 'camera on', 'start camera'];
  const cameraOff = ['turn off camera', 'camera off', 'stop camera'];
  const recordStart = ['start recording', 'record video', 'start video'];
  const recordStop = ['stop recording', 'stop video', 'end recording'];
  
  if (photoCommands.some(cmd => lower.includes(cmd))) {
    if (!isCameraActive) {
      startCamera().then(() => {
        setTimeout(() => capturePhoto(), CAMERA_INIT_DELAY);
      });
    } else {
      capturePhoto();
    }
    return true;
  }
  
  if (cameraOn.some(cmd => lower.includes(cmd))) {
    startCamera();
    return true;
  }
  
  if (cameraOff.some(cmd => lower.includes(cmd))) {
    stopCamera();
    return true;
  }
  
  if (recordStart.some(cmd => lower.includes(cmd))) {
    if (!isCameraActive) {
      startCamera().then(() => {
        setTimeout(() => startRecording(), CAMERA_INIT_DELAY);
      });
    } else {
      startRecording();
    }
    return true;
  }
  
  if (recordStop.some(cmd => lower.includes(cmd))) {
    stopRecording();
    return true;
  }
  
  return false;
}

// Process YouTube control commands
function processYouTubeControls(text) {
  const lower = text.toLowerCase();
  
  // Команды паузы
  if (lower.includes('pause') || lower.includes('stop video') || lower.includes('останови видео')) {
    if (stopYouTubeVideo()) {
      addMessage('Видео на паузе');
    } else {
      addMessage('Нет активного видео');
    }
    return true;
  }
  
  // Команды воспроизведения
  if (lower.includes('play') || lower.includes('continue') || lower.includes('resume') || 
      lower.includes('продолжи') || lower.includes('включи')) {
    if (youtubePlayerState === 'paused') {
      continueYouTubeVideo();
      addMessage('Воспроизведение возобновлено');
    } else if (lastYouTubeUrl) {
      playVideo(lastYouTubeUrl);
      addMessage(`Воспроизводится: "${lastYouTubeQuery}"`);
    } else {
      return false; // Пусть AI обработает общую команду "play"
    }
    return true;
  }
  
  // Команды закрытия
  if (lower.includes('close youtube') || lower.includes('stop youtube') || 
      lower.includes('закрой youtube') || lower.includes('выключи youtube')) {
    closeYouTube();
    return true;
  }
  
  // Команды следующего видео
  if (lower.includes('next video') || lower.includes('another video') || 
      lower.includes('следующее видео') || lower.includes('другое видео')) {
    if (lastYouTubeQuery) {
      searchYouTube(lastYouTubeQuery + ' different').then(url => {
        if (url && url !== lastYouTubeUrl) {
          lastYouTubeUrl = url;
          playVideo(url);
          addMessage('Воспроизводится другое видео');
        }
      });
    } else {
      addMessage('Какое видео вы хотите посмотреть?');
      currentDialogState = DialogState.WAITING_VIDEO_TOPIC;
    }
    return true;
  }
  
  return false;
}

// Analyze if user wants to see videos
function analyzeVideoIntent(text) {
  const lower = text.toLowerCase();
  
  // Explicit video requests
  const videoTriggers = [
    'show me', 'show video', 'play', 'watch', 'find video',
    'youtube', 'music video', 'play song', 'play music',
    'i want to see', 'can you show', 'put on', 'find me',
    'search for', 'look for video'
  ];
  
  // Music/entertainment triggers
  const musicTriggers = [
    'music', 'song', 'artist', 'band', 'singer',
    'rap', 'rock', 'pop', 'jazz', 'classical',
    'drake', 'taylor swift', 'beatles', 'mozart'
  ];
  
  // Check explicit video requests
  if (videoTriggers.some(trigger => lower.includes(trigger))) {
    return true;
  }
  
  // Check if it's just an artist/song name (2-4 words, no question marks)
  const words = text.trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 4 && !text.includes('?')) {
    // Check if any word is a music-related term
    if (musicTriggers.some(trigger => lower.includes(trigger))) {
      return true;
    }
  }
  
  return false;
}

// Analyze if it's a question needing information
function analyzeQuestionIntent(text) {
  const lower = text.toLowerCase();
  
  const questionPatterns = [
    'what is', 'what are', 'what\'s',
    'who is', 'who are', 'who\'s',
    'why', 'how', 'when', 'where', 'which',
    'explain', 'tell me about', 'define',
    'meaning of', 'definition',
    'can you', 'could you', 'would you',
    'is it', 'are they', 'am i'
  ];
  
  return questionPatterns.some(pattern => lower.includes(pattern)) || text.includes('?');
}

// Extract video topic from user request
function extractVideoTopic(text) {
  const lower = text.toLowerCase();
  
  // Remove common command words
  let cleaned = text
    .replace(/^(please |can you |could you |would you )/i, '')
    .replace(/^(show me|play|watch|find|search for|look for|put on|i want to see|show) /i, '')
    .replace(/ ?(video|videos|on youtube|youtube|music|song)$/i, '')
    .trim();
  
  // If we have something meaningful left
  if (cleaned.length > 2) {
    return cleaned;
  }
  
  // Try to extract from patterns
  const patterns = [
    /play (.+?)(?:\s+please)?$/i,
    /show (?:me )?(.+?)$/i,
    /search (?:for )?(.+?)$/i,
    /find (.+?)$/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // If it's just an artist/song name, return as is
  if (!lower.includes(' ') || words.length <= 4) {
    return text;
  }
  
  return null;
}