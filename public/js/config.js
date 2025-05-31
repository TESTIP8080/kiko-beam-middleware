// js/config.js - Configuration and API keys
const config = {
  GEMINI_API_KEY: 'AIzaSyB0nsn5A_a6nAtGQsIZ-RZGrotGoCJaF8A',
  YOUTUBE_API_KEY: 'AIzaSyDt1cRmHyYNEPnu78Wt4Y_RgXNhKwD2Q44',
  DEFAULT_CITY: 'Bishkek',
  DEFAULT_LAT: 42.8746, // Bishkek coordinates
  DEFAULT_LON: 74.5698,
  DEFAULT_TIMEZONE: 'Asia/Bishkek'
};

// Daily.co configuration for hyperjump system
const DAILY_CONFIG = {
  apiKey: '704603242c2670333884868a43d34daab975d493f0c1c1baeeb092eb1426d2b2',
  domain: 'cloud-1ce00036af15462d911659c42a3afbd8.daily.co',
  defaultRoom: 'kiko-matrix-demo'
};

// Pipecat Cloud configuration
const PIPECAT_CONFIG = {
  apiKey: 'pk_d2a4e124-81b0-43ef-a941-bad62025ed2e'
};

// Dialog states
const DialogState = {
  IDLE: 'idle',
  WAITING_VIDEO_TOPIC: 'waiting_video_topic',
  WAITING_CONFIRMATION: 'waiting_confirmation', 
  CLARIFYING: 'clarifying',
  PROCESSING: 'processing'
};

// Constants
const MAX_HISTORY_SIZE = 100;
const MAX_RETRIES = 3;
const SILENCE_TIMEOUT = 30000; // 30 seconds
const YOUTUBE_SEARCH_DELAY = 500;
const CAMERA_INIT_DELAY = 500;
const SUGGESTION_VARIETY = 5; // Number of different suggestions before repeating

// Global state variables
let chatHistory = [];
let currentDialogState = DialogState.IDLE;
let dialogContext = {
  lastIntent: null,
  pendingAction: null,
  clarificationAttempts: 0,
  lastSuggestion: null
};

// Speech state
let recognition = null;
let currentSpeechSynthesis = null;
let processingMessage = false;
let speechQueue = [];
let currentSpeechId = 0;
let isSpeaking = false;
let noSpeechTimer = null;
let restartRecognitionTimer = null;
let retryCount = 0;
let speechActivated = false;
let continuousListening = true; // Enable continuous listening
let silenceTimer = null; // Timer for detecting long silence
let lastInteractionTime = Date.now();

// Camera state
let cameraStream = null;
let isCameraActive = false;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let lastPhotoDataUrl = null;
let lastVideoBlobUrl = null;

// YouTube state
let lastYouTubeUrl = null;
let lastYouTubeQuery = '';
let youtubePlayerState = 'stopped';

// UI state
let thinkingMessageDiv = null;
let lastCommand = '';

// Audio analysis
let audioContext = null;
let analyser = null;
let microphone = null;
let audioStream = null;

// Teleport state
let currentRoomId = null;
let waitingForContactName = false;
let waitingForTeleportTarget = false;

// Weather state
let currentWeather = null;
let weatherUpdateInterval = null;

// User preferences tracking
let userPreferences = {
  favoriteTopics: [],
  watchHistory: [],
  lastWatchTime: null,
  interactionCount: 0,
  preferredLanguage: 'en'
};

// Android TV detection
const isAndroidTV = navigator.userAgent.toLowerCase().includes('android tv') ||
                    navigator.userAgent.toLowerCase().includes('smart tv');

// API endpoints
const API_ENDPOINTS = {
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  TIME: 'https://worldtimeapi.org/api/timezone'
};

// Global functions that need to be available everywhere
function resetSilenceTimer() {
  lastInteractionTime = Date.now();
  
  if (silenceTimer) {
    clearTimeout(silenceTimer);
  }
  
  // Set timer for silence detection
  silenceTimer = setTimeout(() => {
    suggestTopics();
    resetSilenceTimer(); // Reset for next suggestion
  }, SILENCE_TIMEOUT);
}

// Placeholder for suggestTopics - will be defined in main.js
function suggestTopics() {
  // This will be overridden in main.js
}

// Export configuration
window.CONFIG = config;