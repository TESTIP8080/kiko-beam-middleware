// js/youtube.js - YouTube functionality

// Detect YouTube intent in text
function detectYouTubeIntent(text) {
  const lower = text.toLowerCase();
  
  // Direct viewing intents
  const directIntents = [
    'show me', 'play', 'watch', 'find', 'search', 'put on',
    'i want to watch', 'open', 'start', 'can you play', 'put',
    'show', 'i want', 'can i see', 'let me see', 'bring up'
  ];
  
  // Video context
  const videoContext = [
    'video', 'clip', 'movie', 'ufc', 'fight', 'song', 'music',
    'tutorial', 'youtube', 'compilation', 'trailer', 'review',
    'gameplay', 'highlights', 'performance', 'concert', 'show',
    'documentary', 'vlog', 'podcast', 'interview', 'reaction'
  ];
  
  // Check if text contains video-related content even without explicit intent
  const hasVideoContent = videoContext.some(context => lower.includes(context));
  const hasIntent = directIntents.some(intent => lower.includes(intent));
  
  // Also detect pattern like "Michael Jackson Billie Jean" without explicit commands
  const artistPatterns = [
    'michael jackson', 'taylor swift', 'eminem', 'drake', 'beyonce',
    'the beatles', 'queen', 'ed sheeran', 'bruno mars', 'lady gaga'
  ];
  
  // Also detect common video names or song titles
  const videoTitles = [
    'billie jean', 'thriller', 'bohemian rhapsody', 'despacito',
    'gangnam style', 'baby shark', 'shape of you', 'uptown funk'
  ];
  
  const hasSongTitle = videoTitles.some(title => lower.includes(title));
  
  // If text is 3+ words and contains capitalized words, might be a video title
  const words = text.split(' ');
  const hasMultipleWords = words.length >= 3;
  const hasCapitalizedWords = words.some(word => word[0] === word[0].toUpperCase() && word.length > 1);
  
  return hasIntent || hasVideoContent || hasArtist || hasSongTitle || isJustArtist ||
         (hasMultipleWords && hasCapitalizedWords && !lower.includes('?'));
}

// Extract video topic from text
function extractVideoTopic(text) {
  const lower = text.toLowerCase();
  
  // Remove common command words and get the actual topic
  const cleanText = text
    .replace(/(?:please |can you |could you |would you )/gi, '')
    .replace(/(?:show me|play|watch|find|search|open|i want to watch|put on|show|put)/gi, '')
    .replace(/(?:a |an |the |some |any )/gi, '')
    .replace(/(?:video|videos|on youtube|youtube|clip|please)/gi, '')
    .replace(/(?:about|of|with|for )/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If we have something substantial left, return it
  if (cleanText.length > 2) {
    return cleanText;
  }
  
  // Try patterns for extracting topic
  const patterns = [
    /(?:show me|play|watch|find|search|open) (?:a |the )?(?:video )?(?:about |of |with |for )?(.+?)(?:\s+video|\s+on youtube|\s+youtube)?$/i,
    /^(.+?)(?:\s+video|\s+on youtube|\s+youtube)?$/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let topic = match[1].trim();
      if (topic.length > 2) return topic;
    }
  }
  
  // If nothing worked, return the original text minus obvious commands
  return text.replace(/(?:play|show|find|open)/gi, '').trim();
}

// Search YouTube
async function searchYouTube(query, isReplay = false) {
  if (!config.YOUTUBE_API_KEY) return null;
  
  try {
    if (isReplay && lastYouTubeUrl) {
      return lastYouTubeUrl;
    }
    
    console.log("Searching YouTube for:", query);
    
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${config.YOUTUBE_API_KEY}&maxResults=10&relevanceLanguage=en`
    );
    
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    const bestResult = data.items[0];
    return `https://www.youtube.com/watch?v=${bestResult.id.videoId}`;
  } catch(err) {
    console.error('YouTube API error:', err);
    addMessage('YouTube search error. Please try later.', false, true);
    return null;
  }
}

// Play video
function playVideo(url) {
  if(!url) return false;
  
  toggleMediaPanel(true);
  
  if (!isCameraActive) {
    cameraContainer.style.display = 'none';
  }
  
  youtubeContainer.style.display = 'flex';
  videoArea.classList.add('active');
  
  // Updated URL with proper parameters for Vercel
  const embedUrl = url.replace('watch?v=', 'embed/') + 
    '?autoplay=1&enablejsapi=1&origin=' + window.location.origin + 
    '&rel=0&modestbranding=1&playsinline=1&allow=autoplay';
    
  videoIframe.src = embedUrl;
  youtubePlayerState = 'playing';
  console.log("Loaded video:", embedUrl);
  
  // Track user preferences
  if (lastYouTubeQuery) {
    userPreferences.watchHistory.push(lastYouTubeQuery);
    userPreferences.lastWatchTime = Date.now();
    userPreferences.interactionCount++;
    
    // Extract topics from query
    const topics = lastYouTubeQuery.toLowerCase().split(' ');
    topics.forEach(topic => {
      if (topic.length > 3 && !['video', 'youtube', 'play', 'show'].includes(topic)) {
        if (!userPreferences.favoriteTopics.includes(topic)) {
          userPreferences.favoriteTopics.push(topic);
        }
      }
    });
  }
  
  return true;
}

// Stop YouTube video
function stopYouTubeVideo() {
  if (!lastYouTubeUrl || youtubePlayerState === 'stopped') return false;
  
  try {
    if (videoIframe.contentWindow) {
      videoIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      youtubePlayerState = 'paused';
      return true;
    }
  } catch(e) {
    console.error("Error stopping video:", e);
  }
  
  return false;
}

// Close YouTube
function closeYouTube() {
  videoIframe.src = '';
  videoArea.classList.remove('active');
  youtubePlayerState = 'stopped';
  youtubeContainer.style.display = 'none';
  
  if (!isCameraActive) {
    toggleMediaPanel(false);
  } else {
    cameraContainer.style.display = 'flex';
  }
  
  addMessage('YouTube closed', false, false, true);
  updateDialogState(DialogState.IDLE);
}

// Continue YouTube video
function continueYouTubeVideo() {
  if (!lastYouTubeUrl || youtubePlayerState !== 'paused') return false;
  
  try {
    if (videoIframe.contentWindow) {
      videoIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      youtubePlayerState = 'playing';
      return true;
    }
  } catch(e) {
    console.error("Error continuing video:", e);
  }
  
  return false;
}