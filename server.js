const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { networkInterfaces } = require('os');
const cors = require('cors'); // Новая зависимость
require('dotenv').config();

// Функция для получения локального IP-адреса
function getLocalIP() {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Пропускаем internal и non-IPv4 адреса
      if (!net.internal && net.family === 'IPv4') {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// CORS для Daily.co (НОВОЕ)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API маршруты (НОВОЕ)
app.use('/api', require('./routes/api'));

// Ваш существующий WebSocket код
const webrtcWss = new WebSocket.Server({ 
  noServer: true
});

// Отслеживаем активные комнаты и участников (ваш существующий код)
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

// Ваш существующий код upgrade
server.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/webrtc') {
      webrtcWss.handleUpgrade(request, socket, head, (ws) => {
        webrtcWss.emit('connection', ws, request);
      });
    } else {
      // Для любых других WebSocket путей - просто закрываем соединение
      socket.destroy();
    }
  } catch (err) {
    console.error('Ошибка в обработке WebSocket upgrade:', err);
    socket.destroy();
  }
});

// Обслуживаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница (НОВОЕ)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обслуживаем mobile-teleport страницу (НОВОЕ)
app.get('/teleport', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-teleport.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('🚀 KIKO MATRIX Server запущен!');
  console.log(`🌐 Сервер работает на порту ${PORT}`);
  console.log(`🏠 Локальный доступ: http://localhost:${PORT}`);
  console.log(`🌍 Сетевой доступ: http://${localIP}:${PORT}`);
  console.log(`📱 Мобильная версия: http://${localIP}:${PORT}/teleport`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Теперь запустите ngrok в другом терминале:');
  console.log('   ngrok http 3000');
});