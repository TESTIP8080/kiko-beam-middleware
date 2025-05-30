// contacts.js - Enhanced Contact Manager for Daily.co Hyperjump System

class ContactManager {
  constructor() {
    this.contacts = this.loadContacts();
    this.hyperjumpDomain = 'kiko-beam.daily.co'; // Daily.co domain
    
    // Add predefined contacts including KiKo 2
    this._addPredefinedContacts();
    this._upgradeContactsFormat();
  }
  
  loadContacts() {
    try {
      const stored = localStorage.getItem('kiko_hyperjump_contacts');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Try to migrate from old format
      const oldStored = localStorage.getItem('kiko_contacts');
      if (oldStored) {
        const oldContacts = JSON.parse(oldStored);
        // Convert old format to new
        const newContacts = {};
        Object.keys(oldContacts).forEach(key => {
          const contact = oldContacts[key];
          newContacts[key] = {
            ...contact,
            hyperjumpEnabled: true,
            quantumSignature: this._generateQuantumSignature(),
            lastContact: null,
            contactType: 'standard'
          };
        });
        this.saveContacts(newContacts);
        return newContacts;
      }
      
      return {};
    } catch (e) {
      console.error('Error loading hyperjump contacts:', e);
      return {};
    }
  }
  
  saveContacts(contacts = null) {
    try {
      const contactsToSave = contacts || this.contacts;
      localStorage.setItem('kiko_hyperjump_contacts', JSON.stringify(contactsToSave));
      
      // Also save backup in old format for compatibility
      localStorage.setItem('kiko_contacts', JSON.stringify(contactsToSave));
      
      // Dispatch event for UI update
      window.dispatchEvent(new CustomEvent('contact-updated'));
      console.log('Hyperjump contacts saved successfully');
    } catch (e) {
      console.error('Error saving hyperjump contacts:', e);
    }
  }
  
  // Generate quantum signature for enhanced security
  _generateQuantumSignature() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `qsig_${timestamp}_${random}`;
  }
  
  // Upgrade existing contacts to new format
  _upgradeContactsFormat() {
    let upgraded = false;
    
    Object.keys(this.contacts).forEach(key => {
      const contact = this.contacts[key];
      
      // Add new fields if missing
      if (!contact.hyperjumpEnabled) {
        contact.hyperjumpEnabled = true;
        upgraded = true;
      }
      
      if (!contact.quantumSignature) {
        contact.quantumSignature = this._generateQuantumSignature();
        upgraded = true;
      }
      
      if (!contact.contactType) {
        contact.contactType = contact.name === 'KiKo 2' ? 'demo' : 'standard';
        upgraded = true;
      }
      
      if (!contact.created) {
        contact.created = contact.added || new Date().toISOString();
        upgraded = true;
      }
    });
    
    if (upgraded) {
      this.saveContacts();
      console.log('Hyperjump contacts upgraded to new format');
    }
  }
  
  addContact(name, id = null, options = {}) {
    const normalizedName = name.toLowerCase();
    const contactId = id || this.generateContactID();
    
    this.contacts[normalizedName] = { 
      id: contactId, 
      name: name,
      created: new Date().toISOString(),
      lastContact: null,
      hyperjumpEnabled: true,
      quantumSignature: this._generateQuantumSignature(),
      contactType: options.type || 'standard',
      metadata: {
        createdBy: 'voice' || options.createdBy,
        platform: 'daily.co',
        version: '2.0'
      }
    };
    
    this.saveContacts();
    console.log(`Hyperjump contact added: ${name} (${contactId})`);
    return this.contacts[normalizedName];
  }
  
  getContact(name) {
    const contact = this.contacts[name.toLowerCase()];
    if (contact) {
      // Update last accessed time
      contact.lastAccessed = new Date().toISOString();
      this.saveContacts();
    }
    return contact;
  }
  
  listContacts() {
    return Object.values(this.contacts).sort((a, b) => {
      // Sort: demo contacts first, then by creation date
      if (a.contactType === 'demo' && b.contactType !== 'demo') return -1;
      if (b.contactType === 'demo' && a.contactType !== 'demo') return 1;
      return new Date(b.created) - new Date(a.created);
    });
  }
  
  removeContact(name) {
    const normalizedName = name.toLowerCase();
    if (this.contacts[normalizedName]) {
      // Don't allow removal of demo contacts
      if (this.contacts[normalizedName].contactType === 'demo') {
        console.warn('Cannot remove demo contact:', name);
        return false;
      }
      
      delete this.contacts[normalizedName];
      this.saveContacts();
      console.log(`Hyperjump contact removed: ${name}`);
      return true;
    }
    return false;
  }
  
  generateContactID() {
    // Generate a Daily.co compatible room ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `kiko_${timestamp}_${random}`;
  }
  
  generateQRData(name) {
    const contactId = this.generateContactID();
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const qrData = `${baseUrl}mobile-teleport.html?room=${contactId}`;
    
    // Save contact with enhanced metadata
    this.addContact(name, contactId, {
      type: 'qr-generated',
      createdBy: 'qr-system'
    });
    
    return {
      url: qrData,
      id: contactId,
      quantumSignature: this.contacts[name.toLowerCase()].quantumSignature
    };
  }
  
  // Generate simple contact ID and link
  generateSimpleContactID(name) {
    const contactId = this.generateContactID();
    this.addContact(name, contactId, {
      type: 'simple',
      createdBy: 'manual'
    });
    return contactId;
  }
  
  // Create enhanced hyperjump link
  generateContactLink(name) {
    const contactId = this.generateSimpleContactID(name);
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const link = `${baseUrl}mobile-teleport.html?room=${contactId}`;
    
    return {
      id: contactId,
      link: link,
      dailyRoomUrl: `https://${this.hyperjumpDomain}/${contactId}`,
      contact: this.getContact(name)
    };
  }
  
  // Enhanced contact search with fuzzy matching
  findContactByPartialName(partialName) {
    if (!partialName) return null;
    
    const lowerPartial = partialName.toLowerCase().trim();
    const contacts = this.listContacts();
    
    // First: exact match
    let match = contacts.find(c => c.name.toLowerCase() === lowerPartial);
    if (match) return match;
    
    // Second: starts with
    match = contacts.find(c => c.name.toLowerCase().startsWith(lowerPartial));
    if (match) return match;
    
    // Third: contains
    match = contacts.find(c => 
      c.name.toLowerCase().includes(lowerPartial) || 
      lowerPartial.includes(c.name.toLowerCase()));
    if (match) return match;
    
    // Fourth: fuzzy match (simple)
    match = contacts.find(c => {
      const nameParts = c.name.toLowerCase().split(' ');
      const searchParts = lowerPartial.split(' ');
      
      return searchParts.some(searchPart => 
        nameParts.some(namePart => 
          namePart.includes(searchPart) || searchPart.includes(namePart)));
    });
    
    return match;
  }
  
  // Add predefined contacts for demo and testing
  _addPredefinedContacts() {
    // Add KiKo 2 demo contact if it doesn't exist
    const kiko2Name = 'KiKo 2';
    if (!this.getContact(kiko2Name)) {
      this.addContact(kiko2Name, DAILY_CONFIG.defaultRoom, {
        type: 'demo',
        createdBy: 'system'
      });
      console.log('Added predefined KiKo 2 demo contact');
    }
    
    // Add test contacts for development
    if (window.location.hostname === 'localhost') {
      const testContacts = [
        { name: 'Test User', id: 'test_user_room' },
        { name: 'Demo Contact', id: 'demo_contact_room' }
      ];
      
      testContacts.forEach(({ name, id }) => {
        if (!this.getContact(name)) {
          this.addContact(name, id, {
            type: 'test',
            createdBy: 'development'
          });
        }
      });
    }
  }
  
  // Get KiKo 2 contact specifically
  getKiko2Contact() {
    return this.getContact('KiKo 2');
  }
  
  // Update contact with call history
  updateContactHistory(name, action, metadata = {}) {
    const contact = this.getContact(name);
    if (contact) {
      if (!contact.history) {
        contact.history = [];
      }
      
      contact.history.push({
        action: action, // 'call_started', 'call_ended', 'call_failed'
        timestamp: new Date().toISOString(),
        duration: metadata.duration || null,
        metadata: metadata
      });
      
      contact.lastContact = new Date().toISOString();
      
      // Keep only last 10 history entries
      if (contact.history.length > 10) {
        contact.history = contact.history.slice(-10);
      }
      
      this.saveContacts();
    }
  }
  
  // Get contact statistics
  getContactStats(name) {
    const contact = this.getContact(name);
    if (!contact || !contact.history) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastCall: null,
        averageDuration: 0
      };
    }
    
    const callStarts = contact.history.filter(h => h.action === 'call_started');
    const callEnds = contact.history.filter(h => h.action === 'call_ended');
    const callFails = contact.history.filter(h => h.action === 'call_failed');
    
    const durations = callEnds
      .map(h => h.metadata?.duration)
      .filter(d => d && d > 0);
    
    return {
      totalCalls: callStarts.length,
      successfulCalls: callEnds.length,
      failedCalls: callFails.length,
      lastCall: contact.lastContact,
      averageDuration: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0
    };
  }
  
  // Export contacts for backup
  exportContacts() {
    const exportData = {
      version: '2.0',
      platform: 'daily.co',
      exported: new Date().toISOString(),
      contacts: this.contacts
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  // Import contacts from backup
  importContacts(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.version && importData.contacts) {
        let imported = 0;
        let skipped = 0;
        
        Object.keys(importData.contacts).forEach(key => {
          const contact = importData.contacts[key];
          
          if (!this.getContact(contact.name)) {
            this.contacts[key] = {
              ...contact,
              imported: new Date().toISOString()
            };
            imported++;
          } else {
            skipped++;
          }
        });
        
        this.saveContacts();
        
        return {
          success: true,
          imported: imported,
          skipped: skipped,
          message: `Imported ${imported} contacts, skipped ${skipped} existing ones`
        };
      } else {
        throw new Error('Invalid import format');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to import contacts'
      };
    }
  }
  
  // Clean up old contacts
  cleanupOldContacts(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let cleaned = 0;
    
    Object.keys(this.contacts).forEach(key => {
      const contact = this.contacts[key];
      
      // Don't clean demo or frequently used contacts
      if (contact.contactType === 'demo') return;
      
      const contactDate = new Date(contact.created);
      const lastContact = contact.lastContact ? new Date(contact.lastContact) : contactDate;
      
      if (contactDate < cutoffDate && lastContact < cutoffDate) {
        delete this.contacts[key];
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.saveContacts();
      console.log(`Cleaned up ${cleaned} old hyperjump contacts`);
    }
    
    return cleaned;
  }
}

// Create global instance
window.contactManager = new ContactManager();

// Auto-cleanup old contacts on startup
setTimeout(() => {
  if (window.contactManager) {
    window.contactManager.cleanupOldContacts();
  }
}, 5000);