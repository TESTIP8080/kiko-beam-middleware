// js/gemini.js - Enhanced Gemini AI Assistant

// Get response from Gemini API with smart behavior
async function getGeminiResponse(text) {
  if (!config.GEMINI_API_KEY) return 'Please configure Gemini API key for AI assistance';

  try {
    // Prepare history with size limit
    const recentHistory = chatHistory.slice(-7);
    const geminiHistory = recentHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{text: m.content}]
    }));

    // Enhanced system context
    const systemContext = [];
    if (isCameraActive) systemContext.push('Camera is currently active');
    if (youtubePlayerState === 'playing') systemContext.push(`Currently playing: "${lastYouTubeQuery}"`);
    if (currentWeather) systemContext.push(`Weather: ${currentWeather.temp}°C in ${currentWeather.city}`);
    if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) systemContext.push(`In hyperjump call with ${window.kikoWebRTC.roomName || 'unknown contact'}`);
    const contextString = systemContext.length > 0 ? `\nCurrent context: ${systemContext.join(', ')}` : '';

    // Updated system prompt for more natural responses
    const systemPrompt = `You are KiKo - a smart AI assistant with multimedia capabilities and hyperjump communication systems.

🧠 CORE BEHAVIOR:
1. You are primarily a CONVERSATIONAL ASSISTANT - answer questions, chat, provide information
2. Only suggest videos when user EXPLICITLY asks for videos or entertainment
3. When user asks general questions, provide helpful answers WITHOUT searching YouTube
4. Be friendly, knowledgeable, and helpful - like a smart friend

💬 RESPONSE STYLE:
- Answer like a real person, naturally and conversationally
- Keep responses concise and to the point
- DO NOT use markdown formatting, asterisks, or special characters
- DO NOT use bullet points or numbered lists
- Use simple, clear language
- Add natural pauses with commas and periods
- Remember previous context and refer to it when relevant

🎯 VIDEO SEARCH RULES:
- ONLY search for videos when user says: "show me", "play", "find video", "watch", "YouTube", "music video", "play song"
- For general topics, ANSWER the question instead of showing videos
- If user asks "what is X?", EXPLAIN it, don't search for videos
- If unsure, ASK: "Would you like me to explain that or show you a video about it?"

🚀 CAPABILITIES YOU CAN MENTION:
- "I can explain things, answer questions, or show you videos if you'd like"
- "I can also take photos, check weather, or make hyperjump calls"
- "Just ask me anything or tell me what you'd like to see!"

${contextString}

Remember: You're a smart assistant FIRST, video player SECOND. Most queries need answers, not videos!`;

    const body = {
      contents: [
        { role: "model", parts: [{text: systemPrompt}] },
        ...geminiHistory,
        { role:"user", parts:[{text}] }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 150,
        stopSequences: ["**", "*", "#", "```"]
      },
      safetySettings: [
        {category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE"},
        {category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE"},
        {category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE"},
        {category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE"}
      ]
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${config.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      }
    );
    
    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini API error:', err);
      throw new Error(`HTTP status: ${res.status}`);
    }
    
    const data = await res.json();

    if (data.candidates?.[0]?.content?.parts?.[0]) {
      let response = data.candidates[0].content.parts[0].text;
      // Clean up response
      response = response
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return response;
    }
    throw new Error('Unexpected Gemini response');
  } catch(err) {
    console.error('Gemini error:', err);
    const fallbackResponses = [
      'I had a little hiccup. Could you try asking again?',
      'My circuits got a bit tangled. What were you saying?',
      'Oops, lost connection to my brain. One more time?'
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

// Analyze AI response and take appropriate actions
async function analyzeAIResponse(response, originalQuery) {
  const lower = response.toLowerCase();
  const queryLower = originalQuery.toLowerCase();
  
  // Check if AI wants to search for videos
  if (lower.includes("i'll find") || lower.includes("i'll search") || lower.includes("searching for") || 
      lower.includes("let me find") || lower.includes("finding") || lower.includes("i'll show you")) {
    
    // Extract what to search for
    const searchMatch = response.match(/(?:find|search for|show you|finding) (?:a |the |some )?(?:video about |videos about )?(.+?)(?:[!.]|$)/i);
    if (searchMatch && searchMatch[1]) {
      const searchTerm = searchMatch[1].trim();
      
      // Don't auto-search if it's too vague
      if (searchTerm.length > 2 && !searchTerm.includes('?')) {
        setTimeout(async () => {
          clearSpeechQueue();
          addMessage(`Searching for "${searchTerm}"...`);
          const yt = await searchYouTube(searchTerm);
          if (yt) {
            lastYouTubeUrl = yt;
            lastYouTubeQuery = searchTerm;
            playVideo(yt);
          }
        }, 1000);
      }
    }
  }
  
  // Check if AI is asking what kind of video/music
  if (lower.includes("what kind of") || lower.includes("what type of") || 
      lower.includes("what would you like")) {
    currentDialogState = DialogState.WAITING_VIDEO_TOPIC;
    updateDialogState(DialogState.WAITING_VIDEO_TOPIC);
  }
  
  // Check for hyperjump actions
  if (lower.includes("initiating hyperjump") || lower.includes("starting hyperjump")) {
    const nameMatch = response.match(/(?:to|with) (.+?)(?:[!.]|$)/i);
    if (nameMatch && nameMatch[1]) {
      const contactName = nameMatch[1].trim();
      setTimeout(() => {
        if (contactName.toLowerCase().includes('kiko 2')) {
          startTeleportCall(DAILY_CONFIG.defaultRoom, 'KiKo 2', true);
        } else {
          voiceTeleportToContact(contactName);
        }
      }, 1000);
    }
  }
  
  // Check for camera actions
  if (lower.includes("taking a photo") || lower.includes("i'll take a photo")) {
    setTimeout(() => {
      if (!isCameraActive) {
        startCamera().then(() => {
          setTimeout(() => capturePhoto(), CAMERA_INIT_DELAY);
        });
      } else {
        capturePhoto();
      }
    }, 1000);
  }
  
  // Check for weather actions
  if (lower.includes("checking the weather") || lower.includes("let me check the weather")) {
    setTimeout(() => {
      showWeatherInChat();
    }, 1000);
  }
}

// Helper function to determine if user wants video content
function userWantsVideo(text) {
  const lower = text.toLowerCase();
  
  // Explicit video requests
  const videoKeywords = [
    'show me', 'show video', 'play', 'watch', 'find video',
    'youtube', 'music video', 'play song', 'play music',
    'i want to see', 'can you show', 'put on', 'find me'
  ];
  
  // Check if any video keyword is present
  return videoKeywords.some(keyword => lower.includes(keyword));
}

// Helper function to determine if it's a question needing an answer
function isQuestionNeedingAnswer(text) {
  const lower = text.toLowerCase();
  
  // Question words that typically need explanations, not videos
  const questionWords = [
    'what is', 'what are', 'who is', 'who are',
    'why', 'how does', 'how do', 'how to',
    'when', 'where', 'which', 'explain',
    'tell me about', 'define', 'meaning of'
  ];
  
  return questionWords.some(word => lower.includes(word));
}

// Enhanced context builder for better AI understanding
function buildEnhancedContext() {
  const context = {
    multimedia: {
      hasActiveVideo: youtubePlayerState === 'playing',
      lastVideoTopic: lastYouTubeQuery || null,
      cameraActive: isCameraActive
    },
    communication: {
      inCall: window.kikoWebRTC?.callInProgress || false,
      contactsAvailable: window.contactManager?.listContacts().length || 0
    },
    environment: {
      weather: currentWeather ? `${currentWeather.temp}°C, ${currentWeather.description}` : null,
      timeOfDay: getTimeOfDay()
    },
    userBehavior: {
      recentTopics: userPreferences.favoriteTopics.slice(-3),
      interactionCount: userPreferences.interactionCount,
      seemsBored: (Date.now() - lastInteractionTime) > 60000 // Silent for >1 min
    }
  };
  
  return context;
}

// Get time of day for context
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

// Smart response when user is quiet
function generateContextualSuggestion() {
  const context = buildEnhancedContext();
  const suggestions = [];
  
  // Time-based suggestions
  if (context.environment.timeOfDay === 'morning') {
    suggestions.push(
      "Good morning! How can I help you today?",
      "Morning! Want to hear about the weather or news?",
      "Ready to start the day! What are you curious about?"
    );
  } else if (context.environment.timeOfDay === 'evening') {
    suggestions.push(
      "Evening! How was your day?",
      "Want to relax with some music or videos?",
      "Anything interesting happen today?"
    );
  }
  
  // Activity suggestions
  if (!context.multimedia.hasActiveVideo && !context.communication.inCall) {
    suggestions.push(
      "I'm here if you want to chat, learn something, or watch videos!",
      "Feeling curious? Ask me anything!",
      "Want to explore something new? I can explain topics or show videos!"
    );
  }
  
  // Hyperjump suggestions
  if (context.communication.contactsAvailable > 0 && Math.random() < 0.2) {
    suggestions.push(
      "Want to test the hyperjump system? Say 'Call KiKo 2'!",
      "The quantum network is ready for calls!"
    );
  }
  
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}