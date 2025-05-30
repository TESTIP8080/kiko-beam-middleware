const express = require('express');
const router = express.Router();

// Простая проверка здоровья API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KiKo Beam API is working',
    timestamp: new Date().toISOString()
  });
});

// Создание простой комнаты для Daily.co
router.post('/create-room', (req, res) => {
  const { roomName } = req.body;
  const finalRoomName = roomName || `kiko_room_${Date.now()}`;
  
  // Пока что возвращаем простой URL без реального создания комнаты
  res.json({
    success: true,
    roomName: finalRoomName,
    roomUrl: `https://kiko-beam.daily.co/${finalRoomName}`,
    mobileUrl: `${req.protocol}://${req.get('host')}/teleport?room=${finalRoomName}`
  });
});

// Получение информации о комнате
router.get('/room/:roomName', (req, res) => {
  const { roomName } = req.params;
  
  res.json({
    success: true,
    room: {
      name: roomName,
      url: `https://kiko-beam.daily.co/${roomName}`,
      status: 'active'
    }
  });
});

// Простое управление контактами (в памяти)
let contacts = [];

router.post('/contacts', (req, res) => {
  const { name, roomId } = req.body;
  
  if (!name || !roomId) {
    return res.status(400).json({
      success: false,
      error: 'Name and roomId are required'
    });
  }
  
  const contact = {
    id: `contact_${Date.now()}`,
    name: name,
    roomId: roomId,
    created: new Date().toISOString()
  };
  
  contacts.push(contact);
  
  res.json({
    success: true,
    contact: contact
  });
});

router.get('/contacts', (req, res) => {
  res.json({
    success: true,
    contacts: contacts
  });
});

module.exports = router;