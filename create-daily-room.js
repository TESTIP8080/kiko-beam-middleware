// Script to create Daily.co room using API
const axios = require('axios');

const DAILY_API_KEY = '704603242c2670333884868a43d34daab975d493f0c1c1baeeb092eb1426d2b2';
const DAILY_DOMAIN = 'cloud-1ce00036af15462d911659c42a3afbd8';

async function createDailyRoom(roomName) {
  try {
    console.log('🚀 Creating Daily.co room:', roomName);
    
    const response = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        name: roomName,
        privacy: 'public',
        properties: {
          enable_prejoin_ui: false,
          enable_screenshare: true,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          owner_only_broadcast: false,
          enable_recording: 'cloud', // Enable cloud recording
          exp: Math.floor(Date.now() / 1000) + 86400 * 7 // Expires in 7 days
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Room created successfully!');
    console.log('Room URL:', response.data.url);
    console.log('Room Name:', response.data.name);
    console.log('Full response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating room:', error.response?.data || error.message);
    throw error;
  }
}

// Create the demo room
createDailyRoom('kiko-matrix-demo')
  .then(room => {
    console.log('\n📋 Room Details:');
    console.log('- Name:', room.name);
    console.log('- URL:', room.url);
    console.log('- Created:', new Date(room.created_at).toLocaleString());
    console.log('\n🎉 You can now use this room for testing!');
  })
  .catch(error => {
    console.error('\n❌ Failed to create room');
    process.exit(1);
  });

// Optional: List existing rooms
async function listRooms() {
  try {
    const response = await axios.get('https://api.daily.co/v1/rooms', {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    console.log('\n📋 Existing rooms:');
    response.data.data.forEach(room => {
      console.log(`- ${room.name}: ${room.url}`);
    });
  } catch (error) {
    console.error('Error listing rooms:', error.message);
  }
}

// Uncomment to list rooms
// listRooms(); 