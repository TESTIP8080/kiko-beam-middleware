// js/camera.js - Camera functionality

// Start camera
async function startCamera() {
  if (isCameraActive) { 
    addMessage('Camera is already on');
    return; 
  }
  
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {width:{ideal:1280}, height:{ideal:720}}, 
      audio: true
    });
    if (window.cameraPreview) window.cameraPreview.srcObject = cameraStream;
    if (window.cameraArea) window.cameraArea.classList.add('active');
    isCameraActive = true;
    
    toggleMediaPanel(true);
    if (window.cameraContainer) window.cameraContainer.style.display = 'flex';
    
    if (youtubePlayerState === 'stopped' && window.youtubeContainer) {
      window.youtubeContainer.style.display = 'none';
    }
    
    addMessage('Camera turned on', false, false, true);
  } catch(err) {
    console.error('Camera error:', err);
    addMessage('Failed to access camera. Please check permissions.', false, true);
  }
}

// Stop camera
function stopCamera() {
  if (!isCameraActive) {
    addMessage('Camera is not on');
    return;
  }
  
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraPreview.srcObject = null;
    cameraStream = null;
  }
  cameraArea.classList.remove('active');
  isCameraActive = false;
  
  cameraContainer.style.display = 'none';
  
  if (youtubePlayerState === 'stopped') {
    toggleMediaPanel(false);
  } else {
    youtubeContainer.style.display = 'flex';
  }
  
  addMessage('Camera turned off', false, false, true);
}

// Capture photo
async function capturePhoto() {
  if (!cameraStream) { 
    addMessage('Camera is not on', false, true); 
    return; 
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the current video frame
    ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    
    // Create photo gallery if it doesn't exist
    let photoGallery = document.getElementById('photo-gallery');
    if (!photoGallery) {
      photoGallery = document.createElement('div');
      photoGallery.id = 'photo-gallery';
      document.querySelector('.media-container').appendChild(photoGallery);
    }
    
    // Create photo item
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    
    // Create image
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-photo';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
      photoItem.remove();
      if (photoGallery.children.length === 0) {
        photoGallery.remove();
      }
    };
    
    // Add elements to photo item
    photoItem.appendChild(img);
    photoItem.appendChild(deleteBtn);
    photoGallery.appendChild(photoItem);
    
    // Save photo to localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const photos = JSON.parse(localStorage.getItem('camera_photos') || '[]');
      photos.push(reader.result);
      localStorage.setItem('camera_photos', JSON.stringify(photos));
    };
    reader.readAsDataURL(blob);
    
    // Speak confirmation if function exists
    if (typeof window.speakText === 'function') {
      window.speakText('Photo taken');
    }
    
    addMessage('Photo taken', false, false, true);
    
  } catch (error) {
    console.error('Error capturing photo:', error);
    if (typeof window.speakText === 'function') {
      window.speakText('Error taking photo');
    }
    addMessage('Error taking photo', false, true);
  }
}

// Load saved photos on startup
function loadSavedPhotos() {
  const photos = JSON.parse(localStorage.getItem('camera_photos') || '[]');
  if (photos.length > 0) {
    let photoGallery = document.getElementById('photo-gallery');
    if (!photoGallery) {
      photoGallery = document.createElement('div');
      photoGallery.id = 'photo-gallery';
      document.querySelector('.media-container').appendChild(photoGallery);
    }
    
    photos.forEach(photoData => {
      const photoItem = document.createElement('div');
      photoItem.className = 'photo-item';
      
      const img = document.createElement('img');
      img.src = photoData;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-photo';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = () => {
        photoItem.remove();
        const photos = JSON.parse(localStorage.getItem('camera_photos') || '[]');
        const index = photos.indexOf(photoData);
        if (index > -1) {
          photos.splice(index, 1);
          localStorage.setItem('camera_photos', JSON.stringify(photos));
        }
        if (photoGallery.children.length === 0) {
          photoGallery.remove();
        }
      };
      
      photoItem.appendChild(img);
      photoItem.appendChild(deleteBtn);
      photoGallery.appendChild(photoItem);
    });
  }
}

// Call loadSavedPhotos when camera is activated
async function activateCamera() {
  if (isCameraActive) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
      }
    });
    
    cameraPreview.srcObject = stream;
    await cameraPreview.play();
    
    isCameraActive = true;
    if (window.cameraArea) window.cameraArea.classList.add('active');
    
    // Add camera controls
    const controls = document.createElement('div');
    controls.className = 'camera-controls';
    
    const captureBtn = document.createElement('button');
    captureBtn.innerHTML = 'Take Photo';
    captureBtn.onclick = capturePhoto;
    
    controls.appendChild(captureBtn);
    document.querySelector('.media-container').appendChild(controls);
    
    // Load saved photos
    loadSavedPhotos();
    
    toggleMediaPanel(true);
    if (window.cameraContainer) window.cameraContainer.style.display = 'flex';
    
    if (youtubePlayerState === 'stopped' && window.youtubeContainer) {
      window.youtubeContainer.style.display = 'none';
    }
    
    speakText('Camera turned on');
  } catch (error) {
    console.error('Error activating camera:', error);
    speakText('Error activating camera');
  }
}

// Start video recording
function startRecording() {
  if (!cameraStream) { 
    addMessage('Camera is not on, cannot start recording', false, true); 
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
    dl.textContent = 'Download video';
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
  addMessage('Video recording started', false, false, true);
}

// Stop video recording
function stopRecording() {
  if (!mediaRecorder || !isRecording) { 
    addMessage('Not recording video', false, true); 
    return; 
  }
  
  mediaRecorder.stop(); 
  isRecording = false; 
  addMessage('Video recording stopped', false, false, true);
}

// Get weather data
async function getWeather(city = 'Bishkek') {
  // Always use demo data for now
  const demoWeather = {
    temp: Math.floor(Math.random() * 25) + 5,
    description: ['Clear sky', 'Partly cloudy', 'Sunny', 'Light rain'][Math.floor(Math.random() * 4)],
    city: city,
    humidity: Math.floor(Math.random() * 40) + 40,
    windSpeed: (Math.random() * 10 + 2).toFixed(1)
  };
  
  if (config.WEATHER_API_KEY === 'demo') {
    return demoWeather;
  }
  
  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.WEATHER_API_KEY}&units=metric&lang=en`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log('Weather API error, using demo data');
      return demoWeather;
    }
    
    const data = await response.json();
    return {
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      city: data.name,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return demoWeather;
  }
}

// Initialize weather
async function initWeather() {
  const weather = await getWeather();
  if (weather) {
    updateWeatherDisplay(weather);
    
    if (weatherUpdateInterval) {
      clearInterval(weatherUpdateInterval);
    }
    weatherUpdateInterval = setInterval(async () => {
      const newWeather = await getWeather();
      if (newWeather) {
        updateWeatherDisplay(newWeather);
      }
    }, 30 * 60 * 1000);
  }
}