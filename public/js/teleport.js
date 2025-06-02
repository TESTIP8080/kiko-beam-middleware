// js/teleport.js - Enhanced Daily.co Hyperjump System

// Show teleport area (called by button or voice command)
function showTeleportArea() {
  const teleportArea = document.getElementById('teleport-area');
  if (teleportArea) {
    teleportArea.style.display = 'flex';
    
    // Only initialize contact manager once
    if (!window.contactManagerInitialized) {
      setupContactInterface();
      window.contactManagerInitialized = true;
    }
  }
}

// Hide teleport area
function hideTeleportArea() {
  const teleportArea = document.getElementById('teleport-area');
  if (teleportArea) {
    teleportArea.style.display = 'none';
    teleportArea.classList.remove('hyperjump-active', 'kiko2-demo');
    
    // Show contact manager again if it was hidden
    const contactManager = teleportArea.querySelector('.contact-manager');
    if (contactManager) {
      contactManager.style.display = 'block';
    }
  }
  
  // End any active hyperjump
  if (window.kikoWebRTC && window.kikoWebRTC.callInProgress) {
    window.kikoWebRTC.endCall();
  }
}

// Setup contact interface
function setupContactInterface() {
  const contactList = document.getElementById('contact-list');
  const contactNameInput = document.getElementById('contact-name');
  const addSimpleContactBtn = document.getElementById('add-simple-contact');
  const kiko2DemoBtn = document.getElementById('kiko2-demo-btn');
  
  // Setup KiKo 2 demo button
  if (kiko2DemoBtn) {
    kiko2DemoBtn.addEventListener('click', () => {
      addMessage('🚀 Initiating KiKo 2 demo hyperjump...');
      window.kikoWebRTC.callKiko2();
    });
  }
  
  // Refresh contact list
  function refreshContactList() {
    if (!window.contactManager) {
      console.error('Contact manager not available');
      return;
    }
    
    const contacts = window.contactManager.listContacts();
    contactList.innerHTML = '';
    
    if (contacts.length === 0) {
      contactList.innerHTML = `
        <div style="color: #aaa; text-align: center; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 8px; margin: 10px 0;">
          <p>🌌 No hyperjump contacts yet</p>
          <p style="font-size: 0.9em; margin-top: 8px;">Add contacts to enable quantum communication</p>
        </div>`;
      return;
    }
    
    contacts.forEach(contact => {
      const contactItem = document.createElement('div');
      contactItem.className = 'contact-item';
      
      const nameEl = document.createElement('div');
      nameEl.className = 'contact-name';
      nameEl.textContent = `🚀 ${contact.name}`;
      contactItem.appendChild(nameEl);
      
      // Hyperjump button
      const callBtn = document.createElement('button');
      callBtn.innerHTML = '🌌';
      callBtn.className = 'contact-call-btn';
      callBtn.title = 'Start Hyperjump';
      callBtn.addEventListener('click', () => {
        startTeleportCall(contact.id, contact.name);
      });
      contactItem.appendChild(callBtn);
      
      // Share link button
      const linkBtn = document.createElement('button');
      linkBtn.innerHTML = '🔗';
      linkBtn.className = 'contact-link-btn';
      linkBtn.title = 'Copy Hyperjump Link';
      linkBtn.addEventListener('click', () => {
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const link = `${baseUrl}mobile-teleport.html?room=${contact.id}`;
        
        navigator.clipboard.writeText(link).then(() => {
          addMessage(`🔗 Hyperjump link for ${contact.name} copied!`);
          linkBtn.innerHTML = '✅';
          setTimeout(() => {
            linkBtn.innerHTML = '🔗';
          }, 2000);
        }).catch(err => {
          console.error('Copy error:', err);
          addMessage('Failed to copy link', false, true);
        });
      });
      contactItem.appendChild(linkBtn);
      
      // Delete button (not for demo contacts)
      if (contact.contactType !== 'demo') {
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'contact-delete-btn';
        deleteBtn.title = 'Delete Contact';
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Delete hyperjump contact "${contact.name}"?`)) {
            window.contactManager.removeContact(contact.name);
            refreshContactList();
            addMessage(`Contact "${contact.name}" removed`);
          }
        });
        contactItem.appendChild(deleteBtn);
      }
      
      contactList.appendChild(contactItem);
    });
  }
  
  // Add contact functionality
  if (addSimpleContactBtn) {
    addSimpleContactBtn.addEventListener('click', () => {
      const contactName = contactNameInput.value.trim();
      if (contactName) {
        const result = window.contactManager.generateContactLink(contactName);
        refreshContactList();
        contactNameInput.value = '';
        
        addMessage(`✅ Contact "${contactName}" added!`);
        
        // Show the link
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const mobileLink = `${baseUrl}mobile-teleport.html?room=${result.id}`;
        
        addMessage(`🔗 Share this link:\n${mobileLink}`);
      } else {
        addMessage('⚠️ Please enter a contact name', false, true);
      }
    });
  }
  
  // Initial refresh
  refreshContactList();
  
  // Listen for contact updates
  window.addEventListener('contact-updated', refreshContactList);
}

// Start teleport call - MAIN FUNCTION
function startTeleportCall(roomId, contactName, isDemo = false) {
  console.log('🚀 Starting hyperjump:', { roomId, contactName, isDemo });
  
  // Use the webrtc.js system
  if (window.kikoWebRTC) {
    if (isDemo) {
      window.kikoWebRTC.callKiko2();
    } else {
      window.kikoWebRTC.makeCall(roomId, contactName);
    }
  } else {
    console.error('KiKo WebRTC system not available');
    addMessage('❌ Hyperjump system offline. Please reload the page.', false, true);
  }
}

// Voice commands for hyperjump
function processVoiceCommands(text) {
  const lower = text.toLowerCase();
  
  // Check for KiKo 2 demo calls
  const kiko2Patterns = [
    'teleport kiko'
  ];
  
  for (const pattern of kiko2Patterns) {
    if (lower === pattern) {
      startTeleportCall(DAILY_CONFIG.defaultRoom, 'KiKo 2', true);
      return true;
    }
  }
  
  // Check for generic call commands
  const callPatterns = ['call ', 'hyperjump to ', 'connect to ', 'video call '];
  
  for (const pattern of callPatterns) {
    if (lower.includes(pattern)) {
      const contactName = text.substring(lower.indexOf(pattern) + pattern.length).trim();
      if (contactName && contactName.length > 1) {
        voiceTeleportToContact(contactName);
        return true;
      }
    }
  }
  
  // Contact management commands
  if (lower === 'show contacts' || lower === 'contacts' || lower === 'hyperjump contacts') {
    showContactList();
    return true;
  }
  
  if (lower.includes('add contact')) {
    const nameMatch = text.match(/add contact (.+)/i);
    if (nameMatch && nameMatch[1]) {
      addVoiceContact(nameMatch[1].trim());
    } else {
      waitingForContactName = true;
      updateDialogState(DialogState.CLARIFYING);
      addMessage('What name would you like for this contact?');
    }
    return true;
  }
  
  // Handle waiting states
  if (waitingForContactName && text.length > 1) {
    waitingForContactName = false;
    addVoiceContact(text);
    updateDialogState(DialogState.IDLE);
    return true;
  }
  
  return false;
}

// Add contact by voice
function addVoiceContact(name) {
  if (!name || name.trim().length < 2) {
    addMessage('⚠️ Please provide a valid contact name.', false, true);
    return;
  }
  
  const cleanName = name.trim();
  
  try {
    if (!window.contactManager) {
      console.error('Contact manager not initialized');
      addMessage('❌ Contact system offline.', false, true);
      return;
    }
    
    const result = window.contactManager.generateContactLink(cleanName);
    addMessage(`✅ Contact "${cleanName}" added to hyperjump network!`);
    
    // Show the link
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const mobileLink = `${baseUrl}mobile-teleport.html?room=${result.id}`;
    
    addMessage(`🔗 Share this link for hyperjump:\n${mobileLink}`);
    
    // Update UI
    window.dispatchEvent(new CustomEvent('contact-updated'));
    
    // Show teleport area with contacts
    showTeleportArea();
  } catch (error) {
    console.error('Error adding contact:', error);
    addMessage(`❌ Failed to add contact "${cleanName}".`, false, true);
  }
}

// Voice hyperjump to contact
function voiceTeleportToContact(contactName) {
  if (!contactName || contactName.trim().length < 2) {
    addMessage('⚠️ Please specify a contact name.', false, true);
    return;
  }
  
  const cleanName = contactName.trim();
  
  try {
    if (!window.contactManager) {
      console.error('Contact manager not initialized');
      addMessage('❌ Contact system offline.', false, true);
      return;
    }
    
    const matchedContact = window.contactManager.findContactByPartialName(cleanName);
    
    if (matchedContact) {
      startTeleportCall(matchedContact.id, matchedContact.name);
    } else {
      addMessage(`❌ Contact "${cleanName}" not found.`);
      setTimeout(() => {
        addMessage(`💡 Say "add contact ${cleanName}" to add them first.`);
      }, 1000);
    }
  } catch (error) {
    console.error('Error finding contact:', error);
    addMessage(`❌ Error searching for "${cleanName}".`, false, true);
  }
}

// Show contact list
function showContactList() {
  try {
    if (!window.contactManager) {
      console.error('Contact manager not initialized');
      addMessage('❌ Contact system offline.', false, true);
      return;
    }
    
    const contacts = window.contactManager.listContacts();
    
    if (contacts.length === 0) {
      addMessage('🌌 No hyperjump contacts yet.\n\nSay "add contact [name]" to add someone.', false, false, true);
    } else {
      let message = '🌌 Hyperjump Contacts:\n\n';
      contacts.forEach((contact, index) => {
        message += `${index + 1}. 🚀 ${contact.name}\n`;
      });
      message += '\nSay "call [name]" to start hyperjump.';
      addMessage(message, false, false, true);
    }
    
    showTeleportArea();
  } catch (error) {
    console.error('Error listing contacts:', error);
    addMessage('❌ Error accessing contacts.', false, true);
  }
}

// Check for incoming call from URL
function checkForIncomingCall() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  
  if (roomId) {
    console.log('🔍 Detected incoming hyperjump from URL:', roomId);
    setTimeout(() => {
      addMessage('📡 Incoming hyperjump detected!');
      window.kikoWebRTC.makeCall(roomId, 'Incoming Call');
    }, 2000);
  }
}

// Initialize teleport controls
document.addEventListener('DOMContentLoaded', () => {
  // Mute/unmute audio button
  const muteAudioBtn = document.getElementById('mute-audio-btn');
  if (muteAudioBtn) {
    muteAudioBtn.addEventListener('click', () => {
      if (window.kikoWebRTC) {
        window.kikoWebRTC.toggleAudio();
      }
    });
  }
  
  // Video on/off button
  const muteVideoBtn = document.getElementById('mute-video-btn');
  if (muteVideoBtn) {
    muteVideoBtn.addEventListener('click', () => {
      if (window.kikoWebRTC) {
        window.kikoWebRTC.toggleVideo();
      }
    });
  }
  
  // End call button
  const endCallBtn = document.getElementById('end-call-btn');
  if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
      if (window.kikoWebRTC) {
        window.kikoWebRTC.endCall();
      }
    });
  }
  
  // Close teleport button
  const closeTeleportBtn = document.getElementById('close-teleport-btn');
  if (closeTeleportBtn) {
    closeTeleportBtn.addEventListener('click', () => {
      hideTeleportArea();
    });
  }
  
  // Close QR button
  const closeQrBtn = document.getElementById('close-qr-btn');
  if (closeQrBtn) {
    closeQrBtn.addEventListener('click', () => {
      document.getElementById('qr-container').style.display = 'none';
    });
  }
});