# 🎥 KIKO MATRIX - Daily.co WebRTC Setup

## 🔑 API Credentials

### Daily.co
- **Domain**: `cloud-1ce00036af15462d911659c42a3afbd8.daily.co`
- **API Key**: `704603242c2670333884868a43d34daab975d493f0c1c1baeeb092eb1426d2b2`
- **Default Room**: `kiko-matrix-demo`

### Pipecat Cloud
- **API Key**: `pk_d2a4e124-81b0-43ef-a941-bad62025ed2e`

## 🚀 Quick Start

### 1. Create Demo Room
```bash
# Install dependencies if needed
npm install axios

# Create the demo room
node create-daily-room.js
```

### 2. Test WebRTC
Open in browser: `https://your-ngrok-url/test-call.html`

### 3. Test Voice Commands
- Say: "Call KiKo 2"
- Or type in chat: "call kiko 2"

## 📡 Room URLs

### Demo Room
```
https://cloud-1ce00036af15462d911659c42a3afbd8.daily.co/kiko-matrix-demo
```

### Create Custom Room
```javascript
// Using the create-daily-room.js script
node create-daily-room.js your-room-name
```

## 🛠️ Configuration

### Update Domain (if needed)
Edit `public/js/config.js`:
```javascript
const DAILY_CONFIG = {
  apiKey: 'your-api-key',
  domain: 'your-domain.daily.co',
  defaultRoom: 'your-room-name'
};
```

## 📱 Mobile Support

The same room works on mobile devices:
1. Share ngrok URL
2. Allow camera/mic permissions
3. Join the same room

## 🔧 Troubleshooting

### Room Not Found
```bash
# Create the room first
node create-daily-room.js kiko-matrix-demo
```

### Permission Denied
- Check browser permissions for camera/microphone
- Ensure HTTPS (ngrok provides this)

### Connection Failed
- Check internet connection
- Verify Daily.co domain is correct
- Check console for detailed errors

## 📊 Room Management

### List All Rooms
Add to create-daily-room.js:
```javascript
listRooms(); // Uncomment this line
```

### Delete Room
```javascript
// Add this function to create-daily-room.js
async function deleteRoom(roomName) {
  await axios.delete(`https://api.daily.co/v1/rooms/${roomName}`, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}
```

## 🎯 Best Practices

1. **Room Naming**: Use descriptive names like `team-standup-2024`
2. **Expiration**: Rooms expire after 7 days by default
3. **Recording**: Cloud recording is enabled
4. **Privacy**: Rooms are public by default

## 📚 Resources

- [Daily.co Documentation](https://docs.daily.co/)
- [Daily.co REST API](https://docs.daily.co/reference/rest-api)
- [WebRTC Troubleshooting](https://docs.daily.co/guides/troubleshooting) 