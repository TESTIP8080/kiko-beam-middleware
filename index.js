# Создаем директорию для JS-файлов, если её нет
mkdir -p public/js

# Создаем WebRTC клиентскую библиотеку
cat > public/js/webrtc.js << 'EOF'
class KikoWebRTC {
  constructor() {
    this.peer = null;
    this.localStream = null;
    this.ws = null;
    this.connected = false;
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { 
          urls: 'turn:' + window.location.hostname + ':3478',
          username: 'kikobeam',
          credential: 'turnpassword123'
        }
      ]
    };
    
    // Добавляем обработчики событий
    this._setupGlobalEventListeners();
  }
  
  async initialize() {
    try {
      // Подключаемся к сигнальному серверу
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      this.ws = new WebSocket(`${protocol}://${host}/webrtc`);
      
      this.ws.onopen = () => {
        console.log('WebRTC WebSocket соединение установлено');
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Получено WebRTC сообщение:', data.type);
        
        if (data.type === 'signal' && this.peer) {
          this.peer.signal(data.signal);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebRTC WebSocket ошибка:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebRTC WebSocket соединение закрыто');
      };
      
      // Получаем локальный медиа-поток
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      // Отображаем локальное видео
      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        localVideo.srcObject = this.localStream;
        localVideo.muted = true; // Предотвращаем эхо
      }
      
      return new Promise((resolve) => {
        if (this.ws.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          this.ws.onopen = () => resolve();
        }
      });
    } catch (err) {
      console.error('Ошибка инициализации WebRTC:', err);
      throw err;
    }
  }
  
  makeCall(roomId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не подключен');
      return;
    }
    
    // Присоединяемся к комнате
    this.ws.send(JSON.stringify({ 
      type: 'join', 
      room: roomId 
    }));
    
    // Инициализируем как звонящий
    this.peer = new SimplePeer({ 
      initiator: true,
      stream: this.localStream,
      config: this.config,
      trickle: true
    });
    
    this._setupPeerEvents();
    
    // Показываем область телепорта
    document.getElementById('teleport-area').style.display = 'flex';
  }
  
  receiveCall(roomId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не подключен');
      return;
    }
    
    // Присоединяемся к комнате
    this.ws.send(JSON.stringify({ 
      type: 'join', 
      room: roomId 
    }));
    
    // Инициализируем как получатель
    this.peer = new SimplePeer({ 
      initiator: false,
      stream: this.localStream,
      config: this.config,
      trickle: true
    });
    
    this._setupPeerEvents();
    
    // Показываем область телепорта
    document.getElementById('teleport-area').style.display = 'flex';
  }
  
  _setupPeerEvents() {
    // Обрабатываем WebRTC сигналы
    this.peer.on('signal', (data) => {
      console.log('Генерирую сигнал:', data.type);
      this.ws.send(JSON.stringify({
        type: 'signal',
        signal: data
      }));
    });
    
    // Обрабатываем входящий поток
    this.peer.on('stream', (stream) => {
      console.log('Получен удаленный поток');
      const remoteVideo = document.getElementById('remote-video');
      if (remoteVideo) {
        remoteVideo.srcObject = stream;
      }
      this.connected = true;
      
      // Обновляем статус
      const teleportStatus = document.getElementById('teleport-status');
      if (teleportStatus) {
        teleportStatus.textContent = 'Соединено';
        teleportStatus.style.color = '#4CAF50';
      }
    });
    
    // Обрабатываем соединение
    this.peer.on('connect', () => {
      console.log('WebRTC соединение установлено');
      this.connected = true;
    });
    
    // Обрабатываем закрытие соединения
    this.peer.on('close', () => {
      console.log('Вызов завершен');
      this.connected = false;
      
      // Обновляем статус
      const teleportStatus = document.getElementById('teleport-status');
      if (teleportStatus) {
        teleportStatus.textContent = 'Отключено';
        teleportStatus.style.color = '#f44336';
      }
    });
    
    // Обрабатываем ошибки
    this.peer.on('error', (err) => {
      console.error('WebRTC ошибка:', err);
      
      // Обновляем статус
      const teleportStatus = document.getElementById('teleport-status');
      if (teleportStatus) {
        teleportStatus.textContent = 'Ошибка: ' + err.message;
        teleportStatus.style.color = '#f44336';
      }
    });
  }
  
  endCall() {
    // Скрываем область телепорта
    document.getElementById('teleport-area').style.display = 'none';
    
    // Закрываем peer-соединение, если оно существует
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    // Останавливаем трансляцию видео, если она существует
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.connected = false;
    
    // Вызываем пользовательское событие для обновления UI
    window.dispatchEvent(new CustomEvent('teleport-ended'));
  }
  
  _setupGlobalEventListeners() {
    // Обработчик кнопки завершения вызова
    window.addEventListener('teleport-ended', () => {
      // Обновляем статус UI
      const teleportStatus = document.getElementById('teleport-status');
      if (teleportStatus) {
        teleportStatus.textContent = 'Отключено';
        teleportStatus.style.color = '#f44336';
      }
    });
  }
}

// Создаем глобальный экземпляр
window.kikoWebRTC = new KikoWebRTC();
EOF

# Создаем модуль управления контактами
cat > public/js/contacts.js << 'EOF'
class ContactManager {
  constructor() {
    this.contacts = this.loadContacts();
  }
  
  loadContacts() {
    try {
      const stored = localStorage.getItem('kiko_contacts');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Ошибка загрузки контактов:', e);
      return {};
    }
  }
  
  saveContacts() {
    try {
      localStorage.setItem('kiko_contacts', JSON.stringify(this.contacts));
    } catch (e) {
      console.error('Ошибка сохранения контактов:', e);
    }
  }
  
  addContact(name, id) {
    const normalizedName = name.toLowerCase();
    this.contacts[normalizedName] = { 
      id, 
      name, 
      added: new Date().toISOString()
    };
    this.saveContacts();
    return this.contacts[normalizedName];
  }
  
  getContact(name) {
    return this.contacts[name.toLowerCase()];
  }
  
  listContacts() {
    return Object.values(this.contacts);
  }
  
  removeContact(name) {
    const normalizedName = name.toLowerCase();
    if (this.contacts[normalizedName]) {
      delete this.contacts[normalizedName];
      this.saveContacts();
      return true;
    }
    return false;
  }
  
  generateContactID() {
    return 'kiko_' + Math.random().toString(36).substring(2, 10);
  }
  
  generateQRData(name) {
    const contactId = this.generateContactID();
    const baseUrl = window.location.origin;
    const qrData = `${baseUrl}/teleport?room=${contactId}`;
    
    // Сохраняем контакт
    this.addContact(name, contactId);
    
    return {
      url: qrData,
      id: contactId
    };
  }
}

// Создаем глобальный экземпляр
window.contactManager = new ContactManager();
EOF

# Создаем страницу мобильного телепорта
cat > public/mobile-teleport.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KiKo Teleport</title>
  <style>
    :root {
      --bg-primary: #1e1e1e;
      --text-primary: #ffffff;
      --accent-color: #bb86fc;
      --secondary-color: #03dac6;
      --panel-bg: #2c2c2c;
      --success-color: #4CAF50;
      --error-color: #f44336;
      --border-radius: 10px;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .header {
      background-color: var(--panel-bg);
      padding: 15px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    
    .header h1 {
      margin: 0;
      color: var(--accent-color);
      font-size: 1.5rem;
    }
    
    .video-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 15px;
      position: relative;
    }
    
    #remote-video {
      width: 100%;
      flex: 1;
      background-color: #000;
      border-radius: var(--border-radius);
      object-fit: contain;
    }
    
    #local-video {
      position: absolute;
      width: 30%;
      max-height: 30%;
      right: 25px;
      bottom: 80px;
      border-radius: var(--border-radius);
      border: 2px solid var(--secondary-color);
      object-fit: cover;
      background-color: #000;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      padding: 15px;
    }
    
    .control-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background-color: var(--accent-color);
      color: #000;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    
    .control-btn:active {
      transform: scale(0.95);
    }
    
    #answer-btn {
      background-color: var(--success-color);
    }
    
    #end-btn, #decline-btn {
      background-color: var(--error-color);
    }
    
    .status {
      text-align: center;
      padding: 10px;
      color: #aaa;
      font-weight: bold;
    }
    
    .controls-container {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: rgba(0,0,0,0.5);
      border-radius: 0 0 var(--border-radius) var(--border-radius);
    }
    
    .hidden {
      display: none;
    }
    
    .waiting-screen {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-primary);
      z-index: 10;
    }
    
    .pulse {
      width: 100px;
      height: 100px;
      background-color: var(--accent-color);
      border-radius: 50%;
      margin-bottom: 30px;
      position: relative;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(187, 134, 252, 0.7);
      }
      
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 30px rgba(187, 134, 252, 0);
      }
      
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(187, 134, 252, 0);
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>KiKo Teleport</h1>
  </div>
  
  <div class="video-container">
    <video id="remote-video" autoplay playsinline></video>
    <video id="local-video" autoplay playsinline muted></video>
    
    <div class="controls-container">
      <div id="status" class="status">Ожидание подключения...</div>
      
      <div id="incoming-controls" class="controls hidden">
        <button id="answer-btn" class="control-btn">📞</button>
        <button id="decline-btn" class="control-btn">❌</button>
      </div>
      
      <div id="call-controls" class="controls hidden">
        <button id="mute-btn" class="control-btn">🎤</button>
        <button id="video-btn" class="control-btn">📹</button>
        <button id="end-btn" class="control-btn">❌</button>
      </div>
    </div>
    
    <div id="waiting-screen" class="waiting-screen">
      <div class="pulse"></div>
      <h2>Входящий звонок</h2>
      <p>Подождите, устанавливается соединение...</p>
    </div>
  </div>
  
  <!-- Загружаем SimplePeer -->
  <script src="https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js"></script>
  <script>
    // Разбираем параметры URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    let peer = null;
    let localStream = null;
    let ws = null;
    
    // Конфигурация WebRTC
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { 
          urls: 'turn:' + window.location.hostname + ':3478',
          username: 'kikobeam',
          credential: 'turnpassword123'
        }
      ]
    };
    
    // Элементы
    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');
    const statusText = document.getElementById('status');
    const incomingControls = document.getElementById('incoming-controls');
    const callControls = document.getElementById('call-controls');
    const answerBtn = document.getElementById('answer-btn');
    const declineBtn = document.getElementById('decline-btn');
    const muteBtn = document.getElementById('mute-btn');
    const videoBtn = document.getElementById('video-btn');
    const endBtn = document.getElementById('end-btn');
    const waitingScreen = document.getElementById('waiting-screen');
    
    // Состояние звука/видео
    let isMuted = false;
    let isVideoMuted = false;
    
    // Инициализация
    async function initialize() {
      try {
        // Получаем локальный медиапоток
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        
        localVideo.srcObject = localStream;
        
        // Подключаемся к сигнальному серверу
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}://${host}/webrtc`);
        
        # Продолжение mobile-teleport.html
ws.onopen = () => {
  console.log('WebSocket подключен');
  if (roomId) {
    // Присоединяемся к комнате
    ws.send(JSON.stringify({ type: 'join', room: roomId }));
    
    // Показываем элементы управления входящим вызовом
    statusText.textContent = 'Входящий звонок...';
    statusText.style.color = 'var(--accent-color)';
    incomingControls.classList.remove('hidden');
  } else {
    statusText.textContent = 'Ошибка: Отсутствует ID комнаты';
    statusText.style.color = 'var(--error-color)';
  }
};

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log('Получено сообщение:', data.type);
    
    if (data.type === 'signal' && peer) {
      peer.signal(data.signal);
    }
  } catch (e) {
    console.error('Ошибка обработки сообщения:', e);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket ошибка:', error);
  statusText.textContent = 'Ошибка соединения с сервером';
  statusText.style.color = 'var(--error-color)';
};

ws.onclose = () => {
  console.log('WebSocket соединение закрыто');
  statusText.textContent = 'Соединение с сервером потеряно';
  statusText.style.color = 'var(--error-color)';
};

// Настраиваем обработчики событий кнопок
answerBtn.addEventListener('click', answerCall);
declineBtn.addEventListener('click', endCall);
endBtn.addEventListener('click', endCall);

muteBtn.addEventListener('click', toggleMute);
videoBtn.addEventListener('click', toggleVideo);

} catch (err) {
  console.error('Ошибка инициализации:', err);
  statusText.textContent = 'Ошибка: Нет доступа к камере или микрофону';
  statusText.style.color = 'var(--error-color)';
}
}

function answerCall() {
  // Скрываем элементы управления входящим вызовом, показываем элементы управления вызовом
  incomingControls.classList.add('hidden');
  callControls.classList.remove('hidden');
  statusText.textContent = 'Соединение...';
  statusText.style.color = 'var(--secondary-color)';
  
  // Скрываем экран ожидания
  waitingScreen.classList.add('hidden');
  
  // Создаем peer-соединение
  peer = new SimplePeer({
    initiator: false,
    stream: localStream,
    config: config,
    trickle: true
  });
  
  // Обрабатываем сигналы
  peer.on('signal', (data) => {
    console.log('Генерирую сигнал:', data.type);
    ws.send(JSON.stringify({
      type: 'signal',
      signal: data
    }));
  });
  
  // Обрабатываем входящий поток
  peer.on('stream', (stream) => {
    console.log('Получен удаленный поток');
    remoteVideo.srcObject = stream;
    statusText.textContent = 'Соединено';
    statusText.style.color = 'var(--success-color)';
  });
  
  // Обрабатываем соединение
  peer.on('connect', () => {
    console.log('WebRTC соединение установлено');
    statusText.textContent = 'Соединено';
    statusText.style.color = 'var(--success-color)';
  });
  
  // Обрабатываем закрытие соединения
  peer.on('close', () => {
    console.log('Вызов завершен');
    statusText.textContent = 'Вызов завершен';
    statusText.style.color = 'var(--error-color)';
    
    // Закрываем окно после задержки
    setTimeout(() => {
      window.close();
    }, 2000);
  });
  
  // Обрабатываем ошибки
  peer.on('error', (err) => {
    console.error('WebRTC ошибка:', err);
    statusText.textContent = 'Ошибка соединения';
    statusText.style.color = 'var(--error-color)';
  });
}

function endCall() {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  statusText.textContent = 'Вызов завершен';
  statusText.style.color = 'var(--error-color)';
  
  // Закрываем окно после задержки
  setTimeout(() => {
    window.close();
  }, 2000);
}

function toggleMute() {
  if (localStream) {
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMuted;
    });
    
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🎤';
    muteBtn.style.backgroundColor = isMuted ? '#ff9800' : 'var(--accent-color)';
  }
}

function toggleVideo() {
  if (localStream) {
    const videoTracks = localStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = isVideoMuted;
    });
    
    isVideoMuted = !isVideoMuted;
    videoBtn.textContent = isVideoMuted ? '📷' : '📹';
    videoBtn.style.backgroundColor = isVideoMuted ? '#ff9800' : 'var(--accent-color)';
  }
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', initialize);
  </script>
</body>
</html>
EOF

# Создаем обновленный index.html с полным кодом
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <!-- CSP -->
  <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
  <!-- Permissions-Policy — new syntax -->
  <meta name="permissions-policy" content="microphone=(self), camera=(self)">
  <!-- CORS-meta -->
  <meta http-equiv="Access-Control-Allow-Origin" content="*">
  <meta http-equiv="Access-Control-Allow-Methods" content="GET, POST, OPTIONS">
  <meta http-equiv="Access-Control-Allow-Headers" content="Content-Type, Authorization">

  <title>KiKo Beam - Intelligent Chat Assistant</title>

  <style>
    :root {
      --bg-primary: #1e1e1e;
      --text-primary: #ffffff;
      --accent-color: #bb86fc;
      --secondary-color: #03dac6;
      --panel-bg: #2c2c2c;
      --border-radius: 10px;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Arial', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .header {
      background-color: var(--panel-bg);
      padding: 10px 20px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .header h1 {
      margin: 0;
      color: var(--accent-color);
      font-size: 1.5rem;
    }
    .app-container {
      display: flex;
      flex-grow: 1;
      overflow: hidden;
      gap: 10px;
      padding: 10px;
    }
    .chat-panel {
      width: 50%;
      display: flex;
      flex-direction: column;
      background-color: var(--panel-bg);
      border-radius: var(--border-radius);
      padding: 10px;
      position: relative;
      overflow: hidden;
    }
    #chat-container {
      flex-grow: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      background-color: rgba(255,255,255,0.05);
      border-radius: var(--border-radius);
      padding: 15px;
      margin-bottom: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
    }
    .message {
      max-width: 80%;
      margin: 6px 0;
      padding: 10px 15px;
      border-radius: 15px;
      word-wrap: break-word;
    }
    .user-message {
      background-color: var(--accent-color);
      align-self: flex-end;
      margin-left: auto;
      color: #000;
    }
    .ai-message {
      background-color: rgba(255,255,255,0.1);
      align-self: flex-start;
    }
    .error-message {
      color: #ff4b4b;
      background-color: rgba(255,0,0,0.2);
    }
    .thinking-message {
      font-style: italic;
      opacity: 0.8;
    }
    #input-container {
      display: flex;
      gap: 10px;
    }
    #user-input {
      flex-grow: 1;
      padding: 10px;
      background-color: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: var(--text-primary);
      border-radius: 5px;
    }
    #send-btn, #voice-btn, #restart-mic-btn, #voice-config-btn {
      background-color: var(--secondary-color);
      color: var(--bg-primary);
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
    }
    #restart-mic-btn {
      background-color: #ff6b6b;
      color: white;
    }
    #voice-config-btn {
      background-color: #777;
      color: white;
    }
    #voice-btn.active {
      background-color: red;
      color: white;
    }
    #listening-indicator {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background-color: red;
      animation: pulse 1.5s infinite;
      position: absolute;
      top: 15px;
      right: 15px;
      display: none;
    }
    #volume-meter {
      display: none; 
      width: 150px; 
      height: 15px; 
      background: #333; 
      position: absolute; 
      top: 40px; 
      right: 15px; 
      border-radius: 7px; 
      overflow: hidden;
    }
    #volume-level {
      height: 100%; 
      width: 0%; 
      background: linear-gradient(to right, green, yellow, red); 
      transition: width 0.1s;
    }
    .recognition-status {
      font-size: 12px;
      color: #aaa;
      position: absolute;
      top: 15px;
      left: 15px;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
    .media-panel {
      width: 50%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .media-container {
      background-color: var(--panel-bg);
      border-radius: var(--border-radius);
      padding: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      height: calc(50% - 5px);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .media-container h4 {
      margin-bottom: 10px;
    }
    #camera-area, #video-area {
      flex: 1;
      display: none;
      position: relative;
      overflow: hidden;
      border-radius: var(--border-radius);
      background-color: #000;
    }
    #camera-area.active,
    #video-area.active {
      display: flex;
      flex-direction: column;
    }
    #camera-preview {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    #camera-btn {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }
    #video-area iframe {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: var(--border-radius);
      border: none;
    }
    /* YouTube control styles */
    .youtube-controls {
      display: flex;
      gap: 5px;
      margin-top: 5px;
    }
    .youtube-controls button {
      flex: 1;
      padding: 5px 10px;
      background-color: var(--accent-color);
      color: black;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
    }
    /* Android-TV */
    @media (hover: none) {
      #send-btn, #voice-btn {
        padding: 15px 30px;
        font-size: 1.2em;
        transition: none;
      }
      #send-btn:focus, #voice-btn:focus {
        outline: 3px solid var(--accent-color);
        transform: scale(1.1);
      }
      #user-input:focus {
        outline: 3px solid var(--accent-color);
      }
    }
  </style>
  
  <!-- Добавляем новые скрипты для телепорта -->
  <script src="https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
  
  <script>
    /* --- HTTPS redirect --- */
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }

    /* --- Detect Android-TV --- */
    const isAndroidTV = navigator.userAgent.toLowerCase().includes('android tv') ||
                        navigator.userAgent.toLowerCase().includes('smart tv');

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
  </script>
</head>

<body>
  <div class="header">
    <h1>KiKo Beam</h1>
  </div>
  
  <div class="app-container">
    <!-- Chat -->
    <div class="chat-panel">
      <div id="listening-indicator"></div>
      <div id="volume-meter">
        <div id="volume-level"></div>
      </div>
      <div class="recognition-status" id="recognition-status"></div>
      <div id="chat-container"></div>
      <div id="input-container">
        <input type="text" id="user-input" placeholder="Enter message..."/>
        <button id="send-btn">Send</button>
        <button id="voice-btn">🎤</button>
      </div>
    </div>

    <!-- Camera and YouTube -->
    <div class="media-panel">
      <div class="media-container">
        <h4>Camera</h4>
        <div id="camera-area">
          <video id="camera-preview" autoplay muted></video>
          <button id="camera-btn">Take Photo</button>
        </div>
      </div>
      <div class="media-container">
        <h4>YouTube</h4>
        <div id="video-area">
          <iframe id="youtube-iframe" allow="autoplay; encrypted-media"></iframe>
          <div class="youtube-controls">
            <button id="youtube-play">▶️ Play</button>
            <button id="youtube-search">🔍 New Search</button>
          </div>
        </div>
      </div>
      
      <!-- Телепорт -->
      <div class="media-container">
        <h4>Телепорт</h4>
        <div id="teleport-area" style="display: none; flex-direction: column; height: 100%;">
          <div id="teleport-status" style="text-align: center; margin-bottom: 10px; font-weight: bold; color: #aaa;">
            Ожидание соединения...
          </div>
          <div style="position: relative; flex: 1; background-color: #000; border-radius: 10px; overflow: hidden;">
            <video id="remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>
            <video id="local-video" autoplay playsinline muted style="position: absolute; bottom: 10px; right: 10px; width: 150px; height: 100px; object-fit: cover; border-radius: 5px; border: 2px solid #03dac6;"></video>
          </div>
          <div style="display: flex; justify-content: center; margin-top: 10px;">
            <button id="end-call-btn" style="background-color: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Завершить вызов</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- QR код контейнер -->
  <div id="qr-container" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2c2c2c; padding: 20px; border-radius: 10px; text-align: center; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
    <h3 style="margin-top: 0; color: #bb86fc;">Сканируйте для добавления контакта</h3>
    <div id="qrcode" style="margin: 20px auto;"></div>
    <p id="qr-contact-name" style="margin-bottom: 20px; font-weight: bold;"></p>
    <button id="close-qr-btn" style="background-color: #03dac6; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Закрыть</button>
  </div>

  <script>
    /* --- Global error handler --- */
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Global error:', {message, source, lineno, colno, error});
      addMessage(`An error occurred at line ${lineno}: ${message}`, false, true);
      return false;
    };

    /* --- API keys --- */
    const config = {
      GEMINI_API_KEY: (location.hostname === 'localhost' || location.hostname.includes('github.io'))
          ? 'AIzaSyB0nsn5A_a6nAtGQsIZ-RZGrotGoCJaF8A' : '',
      YOUTUBE_API_KEY: (location.hostname === 'localhost' || location.hostname.includes('github.io'))
          ? 'AIzaSyDt1cRmHyYNEPnu78Wt4Y_RgXNhKwD2Q44' : ''
    };
	
	/* --- State variables --- */
    let chatHistory = [];
    const chatContainer = document.getElementById('chat-container');
    const userInput     = document.getElementById('user-input');
    const sendBtn       = document.getElementById('send-btn');
    const voiceBtn      = document.getElementById('voice-btn');
    const listeningIndicator = document.getElementById('listening-indicator');
    const volumeMeter = document.getElementById('volume-meter');
    const volumeLevel = document.getElementById('volume-level');
    const recognitionStatus = document.getElementById('recognition-status');

    const cameraArea    = document.getElementById('camera-area');
    const cameraPreview = document.getElementById('camera-preview');
    const cameraBtn     = document.getElementById('camera-btn');

    const videoArea     = document.getElementById('video-area');
    const videoIframe   = document.getElementById('youtube-iframe');
    const youtubePlayBtn = document.getElementById('youtube-play');
    const youtubeSearchBtn = document.getElementById('youtube-search');

    let recognition = null;
    let currentSpeechSynthesis = null;
    let lastRecognizedText = '';
    let processingMessage = false;
    let cameraStream = null;
    let isCameraActive = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;
    let lastPhotoDataUrl = null;
    let lastVideoBlobUrl = null;
    let lastYouTubeUrl = null;
    let lastYouTubeQuery = '';
    let thinkingMessageDiv = null;
    let isSpeaking = false;
    let noSpeechTimer = null;
    let restartRecognitionTimer = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    // Variables for improved YouTube and voice command logic
    let waitingForYouTubeQuery = false;
    let speechRecognitionPause = false;
    let speechFinalTimeout = null;
    let recognitionInProgress = false;
    let forceMicRestart = false;
    
    // New variables for system state
    let youtubePlayerState = 'stopped'; // 'playing', 'paused', 'stopped'
    let lastCommand = ''; // Store last command for context
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let audioStream = null;
    let speechActivated = false;

    // Store last YouTube query and results
    let lastYouTubeQuery = '';
    let lastYouTubeResults = [];
    let currentVideoIndex = 0;

    /* --- Utilities --- */
    // Improved emoji removal function to fully suppress them from being spoken
    function stripEmojis(text) {
      // More aggressive emoji and smiley removal
      const cleanText = text
        // Remove Unicode emojis
        .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}]/gu, '')
        // Remove text smileys
        .replace(/[:;]-?[)D(PpOo]/g, '') 
        // Remove emoji based on Unicode combinations
        .replace(/[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '')
        // Additional cleaning from common emoji symbols 
        .replace(/[❤✨🙏👍👋👏]/gu, '');
        
      return cleanText;
    }

    function addMessage(text, isUser=false, isError=false) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      if (isError) {
        messageDiv.classList.add('error-message');
      } else {
        messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
      }
      messageDiv.textContent = text;
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      if (!isUser && !isError) speakResponse(text);
      return messageDiv;
    }

    function showThinking() {
      hideThinking();
      thinkingMessageDiv = document.createElement('div');
      thinkingMessageDiv.classList.add('message', 'thinking-message');
      thinkingMessageDiv.textContent = 'Thinking...';
      chatContainer.appendChild(thinkingMessageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function hideThinking() {
      if (thinkingMessageDiv && thinkingMessageDiv.parentNode)
        thinkingMessageDiv.parentNode.removeChild(thinkingMessageDiv);
      thinkingMessageDiv = null;
    }
    
    function stopSpeech() {
      if (currentSpeechSynthesis) {
        window.speechSynthesis.cancel();
        currentSpeechSynthesis = null;
      }
      isSpeaking = false;
    }

    // Update recognition status
    function updateRecognitionStatus(status) {
      recognitionStatus.textContent = status;
    }

    // Activate speech synthesis for browsers
    function activateSpeechSynthesis() {
      if (!speechActivated && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(' ');
        // Set low volume for silent activation
        utterance.volume = 0.1;
        window.speechSynthesis.speak(utterance);
        speechActivated = true;
      }
    }
	
	// Improved speech synthesis function
    function speakResponse(text) {
      hideThinking();
      stopSpeech();
      if (!('speechSynthesis' in window)) return;
      
      try {
        // Stop speech recognition before starting synthesis
        if (recognition && recognition._isRunning) {
          recognition.stop();
          // Mark the stop as temporary
          recognition._tempStop = true;
        }
        
        // More aggressive emoji cleaning
        const cleanText = stripEmojis(text);
        console.log("Original text:", text);
        console.log("Cleaned text for speech:", cleanText);
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 1.2; // Slightly lower speed for better clarity
        
        // Try to get English voice
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (enVoice) {
          console.log("Found English voice:", enVoice.name);
          utterance.voice = enVoice;
        } else {
          console.log("English voice not found, using default voice");
        }
        
        isSpeaking = true;
        updateRecognitionStatus('Speaking...');
        
        utterance.onend = () => { 
          isSpeaking = false;
          updateRecognitionStatus('Ready to listen');
          
          // Restart recognition after speaking ends
          setTimeout(() => {
            if (recognition && !recognition._isRunning && !recognition._manualStop) {
              console.log("Restarting recognition after speech");
              try { 
                recognition.start(); 
              } catch(e) { 
                console.error("Error restarting after speech:", e); 
              }
            }
          }, 500);
        };
        
        currentSpeechSynthesis = utterance;
        window.speechSynthesis.speak(utterance);
      } catch(err) {
        console.error('Speech synthesis error:', err);
        isSpeaking = false;
        updateRecognitionStatus('Speech error');
      }
    }

    /* --- Camera --- */
    async function startCamera() {
      if (isCameraActive) { 
        stopCamera(); 
        return; 
      }
      
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {width:{ideal:1280}, height:{ideal:720}}, 
          audio: true
        });
        cameraPreview.srcObject = cameraStream;
        cameraArea.classList.add('active');
        isCameraActive = true;
        addMessage('Camera turned on');
      } catch(err) {
        console.error('Camera error:', err);
        addMessage('Could not access camera. Check permissions.', false, true);
      }
    }
    
    function stopCamera() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraPreview.srcObject = null;
        cameraStream = null;
      }
      cameraArea.classList.remove('active');
      isCameraActive = false;
      addMessage('Camera turned off');
    }
    
    function capturePhoto() {
      if (!cameraStream) { 
        addMessage('Camera is not enabled', false, true); 
        return; 
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = cameraPreview.videoWidth;
      canvas.height = cameraPreview.videoHeight;
      canvas.getContext('2d').drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
      lastPhotoDataUrl = canvas.toDataURL('image/jpeg');
      
      const img = document.createElement('img');
      img.src = lastPhotoDataUrl;
      img.style.maxWidth='100%'; 
      img.style.maxHeight='200px';
      
      const dl = document.createElement('button');
      dl.textContent='Download Photo';
      dl.style.marginLeft='10px';
      dl.onclick = () => {
        if (!lastPhotoDataUrl) {
          addMessage('No saved photo', false, true);
          return;
        }
        const a = document.createElement('a'); 
        a.href = lastPhotoDataUrl; 
        a.download = 'photo.jpg'; 
        a.click(); 
      };
      
      const msg = addMessage('Photo taken:'); 
      msg.appendChild(img); 
      msg.appendChild(dl);
    }

    /* --- Video --- */
    function startRecording() {
      if (!cameraStream) { 
        addMessage('Camera not enabled, cannot start recording', false, true); 
        return; 
      }
      
      mediaRecorder = new MediaRecorder(cameraStream);
      recordedChunks = []; 
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {type: 'video/mp4'});
        lastVideoBlobUrl = URL.createObjectURL(blob);
        
        const dl = document.createElement('button');
        dl.textContent = 'Download Video';
        dl.onclick = () => {
          if (!lastVideoBlobUrl) {
            addMessage('No recorded video', false, true);
            return;
          }
          const a = document.createElement('a'); 
          a.href = lastVideoBlobUrl; 
          a.download = 'video.mp4'; 
          a.click();
        };
        
        const msg = addMessage('Video recorded:');
        msg.appendChild(dl);
      };
      
      mediaRecorder.start(); 
      isRecording = true; 
      addMessage('Video recording started');
    }
    
    function stopRecording() {
      if (!mediaRecorder || !isRecording) { 
        addMessage('Video is not currently recording.', false, true); 
        return; 
      }
      
      mediaRecorder.stop(); 
      isRecording = false; 
      addMessage('Video recording stopped');
    }
	
	/* --- YouTube functions --- */
    // YouTube search function 
    async function searchYouTube(query, isReplay = false) {
      if (!config.YOUTUBE_API_KEY) return null;
      
      try {
        // If this is a replay request of previous video
        if (isReplay && lastYouTubeUrl) {
          return lastYouTubeUrl;
        }
        
        // Enhance query for better search results
        const enhancedQuery = query + (!query.toLowerCase().includes('music') ? ' documentary' : '');
        console.log("Searching YouTube:", enhancedQuery);
        
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(enhancedQuery)}&type=video&key=${config.YOUTUBE_API_KEY}&maxResults=5&relevanceLanguage=en`
        );
        
        // Check for 401 error (unauthorized access)
        if (res.status === 401) {
          console.error('YouTube API authorization error (401)');
          addMessage('Could not connect to YouTube API. Check API key.', false, true);
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (!data.items || data.items.length === 0) {
          console.log("No results found. Trying simpler query");
          const simpleRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${config.YOUTUBE_API_KEY}&maxResults=5`
          );
          
          if (!simpleRes.ok) {
            throw new Error(`HTTP error with simple query! Status: ${simpleRes.status}`);
          }
          
          const simpleData = await simpleRes.json();
          if (simpleData.items?.[0]) return `https://www.youtube.com/watch?v=${simpleData.items[0].id.videoId}`;
          return null;
        }
        
        // Find most suitable result
        const isMusicQuery = query.toLowerCase().includes('music') || 
                            query.toLowerCase().includes('song') || 
                            query.toLowerCase().includes('clip');
        
        let bestResult = data.items[0];
        
        // If query is not about music, try to find more suitable video
        if (!isMusicQuery) {
          // Look for first video that doesn't seem like a music clip
          const nonMusicVideo = data.items.find(item => {
            const title = item.snippet.title.toLowerCase();
            const channel = item.snippet.channelTitle.toLowerCase();
            
            // Exclude obvious music videos
            return !title.includes('clip') && 
                  !title.includes('music video') && 
                  !title.includes('official video') &&
                  !channel.includes('music') &&
                  !channel.includes('vevo');
          });
          
          if (nonMusicVideo) {
            bestResult = nonMusicVideo;
            console.log("Found non-music video:", bestResult.snippet.title);
          }
        }
        
        return `https://www.youtube.com/watch?v=${bestResult.id.videoId}`;
      } catch(err) {
        console.error('YouTube API error:', err);
        addMessage('Error searching YouTube. Please try again later.', false, true);
        return null;
      }
    }

    // YouTube control functions
    function playVideo(url) {
      if(!url) return false;
      
      videoArea.classList.add('active');
      // Launch with autoplay=1 and enablejsapi=1 for API control
      const embedUrl = url.replace('watch?v=', 'embed/') + '?autoplay=1&enablejsapi=1';
      videoIframe.src = embedUrl;
      youtubePlayerState = 'playing';
      console.log("Loaded video:", embedUrl);
      return true;
    }

    // Function to stop video
    function stopYouTubeVideo() {
      if (!lastYouTubeUrl) return false;
      
      try {
        if (videoIframe.contentWindow) {
          // Use postMessage to control player
          videoIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          youtubePlayerState = 'paused';
          return true;
        }
      } catch(e) {
        console.error("Error stopping video:", e);
      }
      
      return false;
    }

    // Function to continue video playback
    function continueYouTubeVideo() {
      if (!lastYouTubeUrl) return false;
      
      try {
        if (videoIframe.contentWindow) {
          // Use postMessage to control player
          videoIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          youtubePlayerState = 'playing';
          return true;
        }
      } catch(e) {
        console.error("Error continuing video:", e);
      }
      
      return false;
    }

    // Function to play the last video
    function playCurrentYouTube() {
      if (lastYouTubeUrl) {
        playVideo(lastYouTubeUrl);
        addMessage(`Playing: "${lastYouTubeQuery}"`);
      } else {
        addMessage('No videos available to play');
      }
    }
    
    // Function for new YouTube search
    function initiateNewYouTubeSearch() {
      waitingForYouTubeQuery = true;
      addMessage('What video would you like to watch?');
    }
	
	/* --- Gemini API --- */
    async function getGeminiResponse(text) {
      if (!config.GEMINI_API_KEY) return 'Please configure the Gemini API key';

      try {
        const geminiHistory = chatHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{text: m.content}]
        }));

        // Improved instructions for YouTube context
        const videoStatusText = youtubePlayerState === 'playing' 
            ? `Currently playing a video about "${lastYouTubeQuery}".` 
            : lastYouTubeQuery 
                ? `Recently the user watched a video about "${lastYouTubeQuery}".` 
                : '';
        
        // COMPLETELY REWORKED INSTRUCTIONS FOR GEMINI!
        const contextPrompt = `
          ${videoStatusText}
          
          IMPORTANT VIDEO INSTRUCTIONS:
          1. I CAN SHOW VIDEOS AUTOMATICALLY right after your message.
          2. NEVER say phrases like "You can find videos on YouTube" or "Open YouTube".
          3. If the user asks for a video, ALWAYS respond in this format:
             "Playing a video about [topic]!" - this will AUTOMATICALLY start the video.
          4. Examples of correct responses:
             - "Playing a video about space exploration! Enjoy watching! 😄"
             - "I'll find a video about bedtime stories!"
             - "Starting a dance video!"
          5. IMPORTANT: After such responses, the video will start automatically!
          6. Commands for the user:
             - "pause" or "stop video" - to pause
             - "continue video" or "play" - to continue
             - "show the same video again" - to repeat
        `;

        const body = {
          contents: [
            { 
              role: "model", 
              parts: [{
                text: `You are KiKo – an advanced family-friendly robot assistant.
- Use a friendly tone;
- Adapt to the user's age;
- Answer in 1-2 sentences;
- Use emojis;
${contextPrompt}
End your response on a positive note.`
              }]
            },
            ...geminiHistory,
            { role:"user", parts:[{text}] }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000
          },
          safetySettings: [
            {category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
            {category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
            {category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
            {category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE"}
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
        
        // Check for 401 error
        if (res.status === 401) {
          console.error('Gemini API authorization error (401)');
          addMessage('Could not connect to Gemini API. Check API key.', false, true);
          return 'AI server connection error. Please check API key and connection.';
        }
        
        if (!res.ok) {
          const err = await res.text();
          console.error('Gemini API error:', err);
          throw new Error(`HTTP status: ${res.status}`);
        }
        
        const data = await res.json();

        if (data.candidates?.[0]?.content?.parts?.[0]) {
          return data.candidates[0].content.parts[0].text;
        }
        
        if (data.promptFeedback?.blockReason) {
          return `Sorry, content blocked: ${data.promptFeedback.blockReason}`;
        }
        
        throw new Error('Unexpected Gemini response');
      } catch(err) {
        console.error('Gemini error:', err);
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retry attempt ${retryCount} of ${MAX_RETRIES}`);
          return new Promise(r => setTimeout(async () => r(await getGeminiResponse(text)), 1000));
        }
        
        retryCount = 0;
        return `Sorry, there was an error getting a response. Please try again later or rephrase your question.`;
      }
    }

    /* --- Command processing --- */
    async function sendMessage() {
      const text = userInput.value.trim(); 
      if (!text) return;
      
      // Pause speech recognition during command processing
      if (recognition && recognition._isRunning) {
        recognition._tempStop = true;
        recognition.stop();
      }
      
      stopSpeech(); 
      addMessage(text, true);
      chatHistory.push({role: 'user', content: text}); 
      // Limit chat history to save memory
      if (chatHistory.length > 30) chatHistory.shift();
      userInput.value = ''; 
      showThinking();
      
      try { 
        await processCommand(text); 
      } catch(err) {
        console.error('Error processing command:', err); 
        hideThinking(); 
        addMessage('Sorry, an error occurred', false, true);
      } finally {
        // Restart speech recognition after command processing
        if (recognition && recognition._tempStop) {
          recognition._tempStop = false;
          setTimeout(() => {
            try {
              if (!recognition._isRunning && !isSpeaking) {
                recognition.start();
              }
            } catch(e) {
              console.error("Error restarting after command:", e);
            }
          }, 800);
        }
      }
    }
	
	async function processCommand(text) {
      const lower = text.toLowerCase();
      lastCommand = lower; // Save last command for context
      
      // Commands for camera and photos
      const photo = ['take photo', 'take a picture', 'take snapshot'];
      const camOn = ['camera', 'turn on camera'];
      const camOff = ['stop camera', 'turn off camera'];
      const vidStart = ['start video', 'record video'];
      const vidStop = ['stop video', 'stop recording'];
      const dlPhoto = ['download photo', 'save photo'];
      const dlVideo = ['download video', 'save video'];
      const stopAll = ['stop', 'stop everything', 'quit all', 'stop all'];

      // Commands for YouTube control
      const ytStop = ['stop youtube', 'pause video', 'pause', 'stop video on youtube', 'stop youtube'];
      const ytPlay = ['continue video', 'continue youtube', 'play youtube', 'play', 'resume'];
      const ytReplay = ['replay video', 'show again', 'play same video', 'show again', 'one more time'];
      
      // Extended triggers for YouTube (NEW!)
      const ytTriggers = [
        'playing video', 'play video', 'starting video', 'find video',
        'playing a video', 'starting a video', 'finding a video',
        'playing film', 'play film', 'starting film', 'find film',
        'playing clip', 'play clip', 'starting clip', 'find clip',
        'putting on video', 'showing video', 'searching video', 'i\'ll find video'
      ];
      
      // Телепорт команды
      const callCommands = ['call', 'teleport to', 'video call'];
      
      if (callCommands.some(cmd => lower.includes(cmd))) {
        hideThinking();
        
        // Извлекаем имя контакта
        let contactName = '';
        for (const cmd of callCommands) {
          if (lower.includes(cmd)) {
            const cmdIndex = lower.indexOf(cmd) + cmd.length;
            contactName = text.substring(cmdIndex).trim();
            break;
          }
        }
        
        if (contactName) {
          // Проверяем существует ли контакт
          const contact = window.contactManager.getContact(contactName);
          
          if (contact) {
            // Инициализируем WebRTC
            window.kikoWebRTC.initialize().then(() => {
              // Делаем вызов
              window.kikoWebRTC.makeCall(contact.id);
              addMessage(`Телепорт к ${contact.name}...`);
            }).catch(err => {
              console.error('Ошибка инициализации WebRTC:', err);
              addMessage('Не удалось запустить телепорт. Проверьте разрешения камеры.', false, true);
            });
          } else {
            addMessage(`Контакт "${contactName}" не найден. Добавьте его сначала через команду "add contact ${contactName}".`);
          }
        } else {
          addMessage('К кому хотите телепортироваться?');
        }
        return;
      }
      
      // Команда завершения вызова
      if (lower.includes('end call') || lower.includes('hang up') || lower.includes('stop teleport')) {
        hideThinking();
        window.kikoWebRTC.endCall();
        addMessage('Телепорт завершен');
        return;
      }
      
      // Команды добавления контакта
      const addContactCommands = ['add contact', 'add person', 'new contact'];
      
      if (addContactCommands.some(cmd => lower.includes(cmd))) {
        hideThinking();
        
        // Извлекаем имя контакта
        let contactName = '';
        for (const cmd of addContactCommands) {
          if (lower.includes(cmd)) {
            const cmdIndex = lower.indexOf(cmd) + cmd.length;
            contactName = text.substring(cmdIndex).trim();
            break;
          }
        }
        
        if (contactName) {
          // Генерируем QR-код для контакта
          const qrData = window.contactManager.generateQRData(contactName);
          
          // Показываем QR-код
          document.getElementById('qr-contact-name').textContent = contactName;
          document.getElementById('qrcode').innerHTML = '';
          
          new QRCode(document.getElementById('qrcode'), {
            text: qrData.url,
            width: 256,
            height: 256,
            colorDark: '#bb86fc',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
          
          document.getElementById('qr-container').style.display = 'block';
          addMessage(`Создан QR-код для ${contactName}. Попросите их отсканировать этот код для подключения.`);
        } else {
          addMessage('Пожалуйста, укажите имя для контакта.');
        }
        return;
      }
      
      // Команда списка контактов
      if (lower.includes('list contacts') || lower.includes('show contacts')) {
        hideThinking();
        
        const contacts = window.contactManager.listContacts();
        
        if (contacts.length > 0) {
          const contactList = contacts.map(c => c.name).join(', ');
          addMessage(`Ваши контакты: ${contactList}`);
        } else {
          addMessage('У вас еще нет контактов. Добавьте их командой "add contact [имя]"');
        }
        return;
      }

      // Check for stop everything command
      if (stopAll.some(t => lower.includes(t))) {
        hideThinking();
        stopSpeech();
        stopCamera();
        stopRecording();
        if (recognition) {
          recognition._manualStop = true;
          recognition.stop();
        }
        addMessage('All processes stopped');
        return;
      }
      
      if (photo.some(t => lower.includes(t))) {
        hideThinking(); 
        if (!isCameraActive) await startCamera(); 
        capturePhoto(); 
        return;
      }
      
      if (camOn.some(t => lower.includes(t))) {
        hideThinking(); 
        await startCamera(); 
        return;
      }
      
      if (camOff.some(t => lower.includes(t))) {
        hideThinking(); 
        stopCamera(); 
        return;
      }
      
      if (vidStart.some(t => lower.includes(t)) && !lower.includes('youtube') && !lower.includes('youtube')) {
        hideThinking(); 
        if (!isCameraActive) await startCamera(); 
        startRecording(); 
        return;
      }
      
      if (vidStop.some(t => lower.includes(t))) {
        hideThinking(); 
        stopRecording(); 
        return;
      }
      
      if (dlPhoto.some(t => lower.includes(t))) {
        hideThinking();
        if (!lastPhotoDataUrl) {
          addMessage('No photo to download', false, true);
          return;
        }
        const a = document.createElement('a');
        a.href = lastPhotoDataUrl;
        a.download = 'photo.jpg';
        a.click();
        addMessage('Photo downloaded');
        return;
      }
      
      if (dlVideo.some(t => lower.includes(t))) {
        hideThinking();
        if (!lastVideoBlobUrl) {
          addMessage('No video to download', false, true);
          return;
        }
        const a = document.createElement('a');
        a.href = lastVideoBlobUrl;
        a.download = 'video.mp4';
        a.click();
        addMessage('Video downloaded');
        return;
      }

      // Stop YouTube video
      if (ytStop.some(t => lower.includes(t))) {
        hideThinking();
        if (youtubePlayerState === 'playing') {
          if (stopYouTubeVideo()) {
            addMessage('Video paused');
          } else {
            addMessage('Could not stop video');
          }
        } else {
          addMessage('No video currently playing');
        }
        return;
      }

      // Continue YouTube video
      if (ytPlay.some(t => lower.includes(t))) {
        hideThinking();
        if (youtubePlayerState === 'paused') {
          if (continueYouTubeVideo()) {
            addMessage('Playback resumed');
          } else {
            addMessage('Could not resume playback');
          }
        } else if (youtubePlayerState === 'stopped' && lastYouTubeUrl) {
          playVideo(lastYouTubeUrl);
          addMessage(`Playing previous video: "${lastYouTubeQuery}"`);
        } else {
          addMessage('No video to continue');
        }
        return;
      }

      // Replay last YouTube video
      if (ytReplay.some(t => lower.includes(t))) {
        hideThinking();
        if (lastYouTubeUrl) {
          playVideo(lastYouTubeUrl);
          addMessage(`Replaying video: "${lastYouTubeQuery}"`);
        } else {
          addMessage('No previous video to replay');
        }
        return;
      }
      
      // NEW CHECK! If Gemini says it's playing a video, we extract the topic
      // and actually launch search and video playback
      if (ytTriggers.some(t => lower.includes(t))) {
        hideThinking();
        
        // Extract video topic after keywords
        let videoTopic = '';
        
        // Check all triggers to see which one matched
        for (const trigger of ytTriggers) {
          if (lower.includes(trigger)) {
            // Find trigger index and take everything after it
            const triggerIndex = lower.indexOf(trigger) + trigger.length;
            let afterTrigger = text.substring(triggerIndex).trim();
            
            // Remove possible "about"/"on" at the beginning if present
            afterTrigger = afterTrigger.replace(/^(about|on)\s+/i, '').trim();
            
            // Remove possible exclamation marks and emojis at the end
            afterTrigger = afterTrigger.replace(/[!.?]+\s*[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}].*$/u, '').trim();
            
            if (afterTrigger) {
              videoTopic = afterTrigger;
              console.log("Extracted video topic:", videoTopic);
              break;
            }
          }
        }
        
        if (videoTopic) {
          addMessage(`Searching for video about "${videoTopic}"...`);
          
          const yt = await searchYouTube(videoTopic);
          if (yt) {
            lastYouTubeUrl = yt;
            lastYouTubeQuery = videoTopic;
            if (playVideo(yt)) {
              addMessage(`Showing video for query: "${videoTopic}"`);
            } else {
              addMessage('Could not start video. Try clicking the "Play" button');
            }
          } else {
            addMessage(`Could not find video about "${videoTopic}"`);
          }
          return;
        }
      }
	  
	  // Improved logic for YouTube with more precise search
      const youtubeCommands = [
        'show video', 'show youtube', 'find video', 'youtube', 
        'start video on youtube', 'play video', 'open video'
      ];
      
      // Check for direct "play video X" or "show video X" command
      const directYoutubeRegex = /(play|show|find|start|open)\s+video\s+(about|on|with|of|)\s*(.+)/i;
      const directMatch = text.match(directYoutubeRegex);
      
      if (directMatch && directMatch[3]) {
        const query = directMatch[3].trim();
        if (query.length > 2) { // Minimum query length
          hideThinking();
          addMessage(`Searching for video about "${query}"...`);
          
          const yt = await searchYouTube(query);
          if (yt) {
            lastYouTubeUrl = yt;
            lastYouTubeQuery = query;
            if (playVideo(yt)) {
              addMessage(`Showing video for query: "${query}"`);
            } else {
              addMessage('Could not start video. Try clicking the "Play" button');
            }
          } else {
            addMessage(`Could not find video: "${query}"`);
          }
          return;
        }
      }
      
      // Process regular YouTube commands - DON'T search immediately, only ask
      if (youtubeCommands.some(cmd => lower.includes(cmd)) && !waitingForYouTubeQuery) {
        hideThinking();
        
        // If there's a previous query, ask if they want to show it again
        if (lastYouTubeQuery) {
          addMessage(`You recently watched a video about "${lastYouTubeQuery}". Would you like to watch it again or find another video?`);
          waitingForYouTubeQuery = true;
          return;
        } else {
          waitingForYouTubeQuery = true;
          addMessage('What video would you like to watch?');
          return;
        }
      }
      
      // Process response to video query
      if (waitingForYouTubeQuery) {
        waitingForYouTubeQuery = false;
        hideThinking();
        
        // Check if user wants to watch previous video again
        const repeatKeywords = ['again', 'repeat', 'same', 'that one', 'previous', 'that same'];
        const isRepeatRequest = repeatKeywords.some(kw => lower.includes(kw));
        
        if (isRepeatRequest && lastYouTubeUrl) {
          playVideo(lastYouTubeUrl);
          addMessage(`Playing video about "${lastYouTubeQuery}" again`);
          return;
        }
        
        if (text.length < 3) {
          addMessage('Query too short. Please specify what video you want to watch.');
          return;
        }
        
        addMessage(`Searching for video: "${text}"...`);
        const yt = await searchYouTube(text);
        if (yt) {
          lastYouTubeUrl = yt;
          lastYouTubeQuery = text;
          if (playVideo(yt)) {
            addMessage(`Now playing: "${text}"`);
          } else {
            addMessage('Could not start video. Click the "Play" button to start.');
          }
        } else {
          addMessage('Sorry, I couldn\'t find a suitable video for your query.');
        }
        return;
      }

      // Standard response from Gemini considering YouTube context - DON'T search videos automatically
      const aiPrompt = lastYouTubeQuery 
        ? `${text} (Note: user recently watched a video about "${lastYouTubeQuery}")` 
        : text;
      
      const ai = await getGeminiResponse(aiPrompt);
      hideThinking(); 
      addMessage(ai); 
      chatHistory.push({role: 'assistant', content: ai});
    }
	
	/* --- Speech recognition --- */
    function setupSpeechRecognition() {
      if (!('webkitSpeechRecognition' in window)) {
        addMessage('Browser does not support speech recognition', false, true);
        voiceBtn.disabled = true; 
        return null;
      }
      
      const useSimpleMode = localStorage.getItem('simple_voice_mode') === 'true';
      
      const rec = new webkitSpeechRecognition();
      rec.continuous = true; // Always use continuous mode for full phrases
      rec.interimResults = true; // Always enable for better feedback
      rec.lang = 'en-US';
      rec.maxAlternatives = 3;
      
      // Additional properties
      rec._isRunning = false;
      rec._manualStop = false;
      rec._tempStop = false;
      rec._wasStarted = false;
      rec._completeCommand = ''; // To save complete command
      rec._intermediateTexts = []; // Array to save intermediate results
      rec._processingTimeout = null; // Timer for command processing
      
      function updateVisualStatus(isRunning) {
        listeningIndicator.style.display = isRunning ? 'block' : 'none';
        voiceBtn.classList.toggle('active', isRunning);
        voiceBtn.textContent = isRunning ? '🎤 Active' : '🎤';
        updateRecognitionStatus(isRunning ? 'Listening...' : 'Microphone off');
      }

      rec.onstart = () => {
        rec._isRunning = true;
        updateVisualStatus(true);
        
        // Reset accumulated data
        rec._completeCommand = '';
        rec._intermediateTexts = [];
        
        if (volumeMeter) {
          volumeMeter.style.display = 'block';
          volumeLevel.style.width = '0%';
        }
        
        activateSpeechSynthesis();
        setupVolumeMeter();
        
        if (!rec._wasStarted) {
          addMessage('Speech recognition started. I\'m listening.'); 
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
        
        // Hide volume meter
        if (volumeMeter) {
          volumeMeter.style.display = 'none';
        }
        
        console.log("Recognition stopped", 
                  "manual:", rec._manualStop, 
                  "temp:", rec._tempStop,
                  "speaking:", isSpeaking);
        
        // Only don't restart when explicitly stopped by user
        if (!rec._manualStop && !isSpeaking) {
          // Delay before restart
          const delay = isSpeaking ? 1000 : 600;
          
          restartRecognitionTimer = setTimeout(() => {
            // Check if mic wasn't started during this time
            if (!rec._isRunning && !rec._manualStop && !isSpeaking) {
              console.log("Automatic microphone restart");
              try {
                rec.start();
              } catch(err) {
                console.error('Error restarting:', err);
                
                // Another attempt after longer interval
                setTimeout(() => {
                  try { 
                    console.log("Second restart attempt");
                    rec.start(); 
                  } catch(err2) { 
                    console.error("Repeated error:", err2);
                    updateRecognitionStatus('Recognition start error');
                  }
                }, 1000);
              }
            }
          }, delay);
        }
        
        // Reset temporary stop flag
        rec._tempStop = false;
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        
        // Only notify user about critical errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          addMessage('Microphone access denied! Please allow access in browser settings.', false, true);
          updateRecognitionStatus('No microphone access');
        } else if (event.error === 'no-speech') {
          updateRecognitionStatus('No speech detected');
        } else if (event.error === 'audio-capture') {
          updateRecognitionStatus('Audio capture problem');
        } else if (event.error === 'network') {
          updateRecognitionStatus('Network error');
        } else {
          updateRecognitionStatus('Recognition error');
        }
        
        // Restart for certain errors
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
          if (rec._isRunning) {
            rec.stop();
          } else if (!isSpeaking) {
            setTimeout(() => {
              try {
                rec.start();
              } catch(e) {
                console.error(`Error restarting after ${event.error}:`, e);
              }
            }, 500);
          }
        }
      };

      // COMPLETELY REWRITTEN RESULTS HANDLER
      rec.onresult = async (event) => {
        if (isSpeaking) return;
        
        const result = event.results[event.results.length - 1];
        
        // Find best variant
        let bestText = '';
        let highestConfidence = 0;
        
        for (let i = 0; i < result.length; i++) {
          if (result[i].confidence > highestConfidence) {
            highestConfidence = result[i].confidence;
            bestText = result[i].transcript.trim();
          }
        }
        
        // Update recognition status
        if (bestText.length > 0) {
          updateRecognitionStatus('Heard: ' + bestText);
        }
        
        // Process commands depending on whether this is a final result
        if (result.isFinal) {
          clearTimeout(rec._processingTimeout);
          
          // IMPORTANT! Save full recognized text
          rec._completeCommand = bestText;
          
          // Check command length and YouTube request indicators
          const lower = bestText.toLowerCase();
          const isYoutubeRequest = lower.includes('video') || 
                               lower.includes('youtube') || 
                               lower.includes('youtube') ||
                               lower.includes('film') ||
                               lower.includes('clip');
          
          // Process command with small delay to gather all fragments
          rec._processingTimeout = setTimeout(() => {
            if (!processingMessage) {
              processingMessage = true;
              
              // Use full command
              const finalCommand = rec._completeCommand;
              
              // Clear saved data
              rec._completeCommand = '';
              rec._intermediateTexts = [];
              
              addMessage(finalCommand, true);
              showThinking();
              
              // Temporarily stop recognition
              if (rec._isRunning) {
                rec._tempStop = true;
                rec.stop();
              }
              
              processCommand(finalCommand).finally(() => {
                processingMessage = false;
              });
            }
          }, isYoutubeRequest ? 800 : 300); // Wait longer for YouTube requests
          
        } else {
          // For interim results save text
          if (bestText.length > 5) {
            rec._intermediateTexts.push(bestText);
            
            // If text is good quality and long enough, update full command
            if (highestConfidence > 0.6 && bestText.length > 10) {
              rec._completeCommand = bestText;
            }
            
            // Reset previous timer and create new one
            clearTimeout(rec._processingTimeout);
            
            // If user paused, process the command
            rec._processingTimeout = setTimeout(() => {
              if (!processingMessage && rec._completeCommand) {
                processingMessage = true;
                
                // Use the longest saved command
                let bestCommand = rec._completeCommand;
                if (rec._intermediateTexts.length > 0) {
                  const longestText = rec._intermediateTexts.reduce((a, b) => 
                    a.length > b.length ? a : b, '');
                  if (longestText.length > bestCommand.length) {
                    bestCommand = longestText;
                  }
                }
                
                // Clear saved data
                rec._completeCommand = '';
                rec._intermediateTexts = [];
                
                addMessage(bestCommand, true);
                showThinking();
                
                // Temporarily stop recognition
                if (rec._isRunning) {
                  rec._tempStop = true;
                  rec.stop();
                }
                
                processCommand(bestCommand).finally(() => {
                  processingMessage = false;
                });
              }
            }, 1500); // Longer delay to ensure command is complete
          }
        }
      };
      
      return rec;
    }
	
	/* --- Volume meter --- */
    function setupVolumeMeter() {
      if (audioContext) return; // Avoid repeated initialization
      
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              audioStream = stream;
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              analyser = audioContext.createAnalyser();
              microphone = audioContext.createMediaStreamSource(stream);
              
              analyser.smoothingTimeConstant = 0.8;
              analyser.fftSize = 1024;
              
              microphone.connect(analyser);
              
              // Create script processor to get data
              const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
              analyser.connect(scriptProcessor);
              scriptProcessor.connect(audioContext.destination);
              
              scriptProcessor.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const values = array.reduce((a, b) => a + b, 0) / array.length;
                
                if (volumeLevel) {
                  volumeLevel.style.width = Math.min(values * 2, 100) + '%';
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

    // Free audio resources
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

    /* --- Microphone control --- */
    function toggleVoiceInput() {
      if (!recognition) {
        recognition = setupSpeechRecognition();
        if (!recognition) return;
      }
      
      if (recognition._isRunning) {
        recognition._manualStop = true;
        recognition.stop();
        addMessage('Microphone turned off');
      } else {
        try {
          // Activate speech synthesis before starting recognition
          activateSpeechSynthesis();
          
          // Reset flags and start
          recognition._manualStop = false;
          recognition.start();
          
          addMessage('Microphone turned on');
        } catch(e) {
          console.error("Error starting microphone:", e);
          addMessage('Could not enable microphone', false, true);
        }
      }
    }

    // Function to add microphone restart button
    function addRestartMicButton() {
      if (document.getElementById('restart-mic-btn')) return;
      
      const restartBtn = document.createElement('button');
      restartBtn.id = 'restart-mic-btn';
      restartBtn.textContent = '🔄 Mic';
      restartBtn.style.marginLeft = '5px';
      
      restartBtn.addEventListener('click', () => {
        // Full initialization of new recognition instance
        if (recognition) {
          if (recognition._isRunning) {
            recognition.stop();
          }
          recognition = null;
        }
        
        // Clean up audio resources
        cleanupAudioResources();
        
        setTimeout(() => {
          recognition = setupSpeechRecognition();
          if (recognition) {
            try {
              recognition.start();
              addMessage('Recognition restarted');
            } catch(e) {
              console.error('Error restarting:', e);
              addMessage('Failed to restart microphone', false, true);
            }
          }
        }, 500);
      });
      
      document.getElementById('input-container').appendChild(restartBtn);
    }
    
    // Function to add recognition mode configuration button
    function addVoiceConfigButton() {
      if (document.getElementById('voice-config-btn')) return;
      
      const configBtn = document.createElement('button');
      configBtn.id = 'voice-config-btn';
      configBtn.textContent = '⚙️';
      configBtn.style.marginLeft = '5px';
      
      configBtn.addEventListener('click', () => {
        const useSimpleMode = confirm('Use simplified speech recognition mode? (Recommended for devices with recognition issues)');
        
        // Stop current recognition
        if (recognition) {
          if (recognition._isRunning) {
            recognition.stop();
          }
          recognition = null;
        }
        
        // Clean up audio resources
        cleanupAudioResources();
        
        // Save selected mode and restart
        setTimeout(() => {
          localStorage.setItem('simple_voice_mode', useSimpleMode ? 'true' : 'false');
          
          if (useSimpleMode) {
            addMessage('Simplified recognition mode enabled. Speak in short phrases with pauses.');
          } else {
            addMessage('Standard recognition mode enabled.');
          }
          
          recognition = setupSpeechRecognition();
          if (recognition) {
            try {
              recognition.start();
            } catch(e) {
              console.error('Error starting after mode change:', e);
            }
          }
        }, 500);
      });
      
      document.getElementById('input-container').appendChild(configBtn);
    }
	
	/* --- Event handlers --- */
    // Text input
    sendBtn.addEventListener('click', () => {
      activateSpeechSynthesis();
      sendMessage();
    });
    
    userInput.addEventListener('keydown', e => { 
      if (e.key === 'Enter') {
        activateSpeechSynthesis();
        sendMessage();
      }
    });
    
    // Voice input
    voiceBtn.addEventListener('click', () => {
      activateSpeechSynthesis();
      toggleVoiceInput();
    });
    
    // Camera
    cameraBtn.addEventListener('click', capturePhoto);
    
    // YouTube
    youtubePlayBtn.addEventListener('click', () => {
      if (youtubePlayerState === 'paused') {
        continueYouTubeVideo();
        addMessage('Playback resumed');
      } else {
        playCurrentYouTube();
      }
    });
    
    youtubeSearchBtn.addEventListener('click', initiateNewYouTubeSearch);
    
    // Кнопки телепорта
    document.getElementById('end-call-btn').addEventListener('click', () => {
      window.kikoWebRTC.endCall();
      addMessage('Телепорт завершен');
    });

    document.getElementById('close-qr-btn').addEventListener('click', () => {
      document.getElementById('qr-container').style.display = 'none';
    });

    // Remote button handling for Android TV
    document.addEventListener('keydown', (e) => {
      switch(e.keyCode) {
        case 13: // OK button
          if (document.activeElement === userInput) {
            sendMessage();
          } else {
            toggleVoiceInput();
          }
          break;
        case 37: // Left
          userInput.focus();
          break;
        case 39: // Right
          voiceBtn.focus();
          break;
        case 27: // Back
          stopSpeech();
          stopCamera();
          stopRecording();
          if (recognition && recognition._isRunning) {
            recognition._manualStop = true;
            recognition.stop();
          }
          break;
      }
    });

    /* --- Initialization --- */
    function init() {
      // If device is Android TV
      if (isAndroidTV) {
        initForTV();
      }
      
      // Preload voices
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
      
      // Add additional control buttons
      addRestartMicButton();
      addVoiceConfigButton();
      
      // Load saved recognition mode
      const savedMode = localStorage.getItem('simple_voice_mode');
      if (savedMode === 'true') {
        updateRecognitionStatus('Mode: simplified recognition');
      } else {
        updateRecognitionStatus('Mode: standard recognition');
      }
      
      // Welcome message
      setTimeout(() => {
        addMessage('Hi! I\'m KiKo Beam - your smart assistant. How can I help you today? 😊');
        
        // Automatic speech recognition start with delay
        setTimeout(() => {
          if (!recognition) {
            recognition = setupSpeechRecognition();
          }
          
          if (recognition && !recognition._isRunning) {
            try {
              recognition.start();
            } catch(e) {
              console.error("Error on first recognition start:", e);
              setTimeout(() => {
                try { 
                  recognition.start(); 
                } catch(e) { 
                  console.error("Repeated start error:", e);
                  addMessage("Couldn't automatically start the microphone. Click the 🎤 button to enable it manually.");
                }
              }, 1000);
            }
          }
        }, 1000);
      }, 500);
    }

    // Start application
    window.addEventListener('DOMContentLoaded', init);

    // Process YouTube commands
    async function handleYouTubeCommand(command) {
      const lowerCommand = command.toLowerCase();
      
      // Handle "next video" command
      if (lowerCommand === 'next' || lowerCommand === 'next video') {
        if (lastYouTubeResults.length > 0) {
          currentVideoIndex = (currentVideoIndex + 1) % lastYouTubeResults.length;
          const nextVideo = lastYouTubeResults[currentVideoIndex];
          showYouTubeVideo(nextVideo);
          return `Playing next video: ${nextVideo.title}`;
        } else {
          return "No previous search results found. Please search for videos first.";
        }
      }
      
      // Handle new search
      if (lowerCommand.includes('show') || lowerCommand.includes('find') || 
          lowerCommand.includes('search') || lowerCommand.includes('play')) {
        // Extract search query
        const query = command.replace(/^(show|find|search|play)\s+/i, '').trim();
        lastYouTubeQuery = query;
        
        try {
          // Search YouTube
          const results = await searchYouTube(query);
          lastYouTubeResults = results;
          currentVideoIndex = 0;
          
          if (results.length > 0) {
            showYouTubeVideo(results[0]);
            return `Found ${results.length} videos. Playing first result. Say "next" for more.`;
          } else {
            return "No videos found. Please try a different search.";
          }
        } catch (error) {
          console.error('YouTube search error:', error);
          return "Error searching YouTube. Please try again.";
        }
      }
      
      return null; // Not a YouTube command
    }

    // Show YouTube video
    function showYouTubeVideo(video) {
      const videoContainer = document.getElementById('video-container');
      if (!videoContainer) return;
      
      // Create or update iframe
      let iframe = videoContainer.querySelector('iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '315';
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        videoContainer.appendChild(iframe);
      }
      
      // Update video source
      iframe.src = `https://www.youtube.com/embed/${video.id}`;
      
      // Show container
      videoContainer.style.display = 'block';
    }

    // Search YouTube
    async function searchYouTube(query) {
      try {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        return data.items || [];
      } catch (error) {
        console.error('YouTube search error:', error);
        throw error;
      }
    }

    // Update command processing
    async function processCommand(command) {
      // Try YouTube commands first
      const youtubeResponse = await handleYouTubeCommand(command);
      if (youtubeResponse) {
        addMessage(youtubeResponse, false);
        return;
      }
      
      // Process other commands...
      // ... existing code ...
    }
  </script>
  
  <!-- Подключаем кастомные WebRTC и Contacts скрипты -->
  <script src="/js/webrtc.js"></script>
  <script src="/js/contacts.js"></script>
</body>
</html>
EOF

# Создаем обновленный server.js
cat > server.js << 'EOF'
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config();

// Другие импорты
const setupWebSocket = require('./deepgram-websocket');

// Инициализируем Express
const app = express();
const server = http.createServer(app);

// Настраиваем WebSocket для Deepgram
setupWebSocket(server);

// Настраиваем WebSocket для WebRTC сигналинга
const webrtcWss = new WebSocket.Server({ 
  noServer: true
});

// Отслеживаем активные комнаты и участников
const rooms = new Map();

webrtcWss.on('connection', (ws) => {
  console.log('WebRTC WebSocket подключение установлено');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebRTC сообщение:', data.type);
      
      // Обрабатываем разные типы сигналов
      switch(data.type) {
        case 'join':
          // Присоединяемся или создаем комнату
          const roomId = data.room;
          console.log(`Клиент присоединяется к комнате: ${roomId}`);
          
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId).add(ws);
          ws.roomId = roomId;
          break;
          
        case 'signal':
          // Перенаправляем WebRTC сигналы другим участникам в той же комнате
          if (ws.roomId && rooms.has(ws.roomId)) {
            console.log(`Перенаправляем сигнал в комнате: ${ws.roomId}`);
            rooms.get(ws.roomId).forEach(peer => {
              if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                peer.send(message);
              }
            });
          }
          break;
      }
    } catch (err) {
      console.error('Ошибка обработки WebRTC сообщения:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('WebRTC WebSocket соединение закрыто');
    // Удаляем участника из комнаты при отключении
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
      if (rooms.get(ws.roomId).size === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

// Обрабатываем upgrade для WebRTC WebSocket path
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/webrtc') {
    webrtcWss.handleUpgrade(request, socket, head, (ws) => {
      webrtcWss.emit('connection', ws, request);
    });
  }
});

// Обслуживаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Обслуживаем mobile-teleport страницу
app.get('/teleport', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-teleport.html'));
});

// Стандартные настройки сервера...
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Мобильный телепорт доступен по адресу: http://localhost:${PORT}/teleport`);
});
EOF

# Создаем docker-compose.yml для Coturn
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    ports:
      - "3478:3478/tcp"
      - "3478:3478/udp"
      - "5349:5349/tcp"
      - "5349:5349/udp"
      - "49152-65535:49152-65535/udp"
    environment:
      - TURN_USERNAME=kikobeam
      - TURN_PASSWORD=turnpassword123
    restart: always
    command: ["-n", "--lt-cred-mech", "--fingerprint"]
EOF