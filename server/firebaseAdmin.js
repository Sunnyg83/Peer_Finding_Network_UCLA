// for system messages in firebase (not ready yet)

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// For now, we'll create a placeholder that you can configure later
let db;

try {
  // Initialize Firebase Admin SDK
  // You'll need to add your service account key file
  // admin.initializeApp({
  //   credential: admin.credential.cert(require('./path-to-your-service-account-key.json')),
  //   databaseURL: 'your-firebase-project-url'
  // });
  
  // db = admin.firestore();
  console.log('Firebase Admin not yet configured - system messages will be logged instead');
} catch (error) {
  console.log('Firebase Admin initialization failed:', error.message);
}

// Function to send system message (placeholder for now)
const sendSystemMessage = async (conversationId, message, eventType = 'system') => {
  try {
    if (db) {
      // If Firebase is configured, send the actual message
      const messageRef = db.collection('conversations').doc(conversationId).collection('messages').doc();
      await messageRef.set({
        senderId: 'system',
        text: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        readBy: [],
        eventType: eventType,
        isSystemMessage: true
      });
      
      // Update conversation metadata
      const convRef = db.collection('conversations').doc(conversationId);
      await convRef.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: message
      });
      
      console.log(`System message sent: ${message}`);
    } else {
      // If Firebase not configured, just log the message
      console.log(`[SYSTEM MESSAGE] ${message} (Firebase not configured)`);
    }
  } catch (error) {
    console.error('Error sending system message:', error);
  }
};

// Function to update group members in Firebase conversation
const updateGroupMembers = async (conversationId, newMemberIds, action, userName) => {
  try {
    if (db) {
      // If Firebase is configured, update the conversation
      const convRef = db.collection('conversations').doc(conversationId);
      await convRef.update({
        users: newMemberIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Send system message
      let systemMessage = '';
      if (action === 'join' && userName) {
        systemMessage = `${userName} joined the group`;
      } else if (action === 'leave' && userName) {
        systemMessage = `${userName} left the group`;
      }
      
      if (systemMessage) {
        await sendSystemMessage(conversationId, systemMessage, action);
      }
      
      console.log(`Group members updated: ${systemMessage}`);
    } else {
      // If Firebase not configured, just log
      console.log(`[GROUP UPDATE] ${action}: ${userName} (Firebase not configured)`);
    }
  } catch (error) {
    console.error('Error updating group members:', error);
  }
};

// Function to get Firebase conversation ID for a group
const getGroupConversationId = async (groupId) => {
  try {
    if (db) {
      // Search for conversations with this groupId
      const conversationsRef = db.collection('conversations');
      const query = conversationsRef.where('groupId', '==', groupId).where('isGroup', '==', true);
      const snapshot = await query.get();
      
      if (!snapshot.empty) {
        // Return the first (and should be only) conversation ID
        return snapshot.docs[0].id;
      }
      return null;
    } else {
      // If Firebase not configured, just log
      console.log(`[GET CONVERSATION ID] Group ${groupId} (Firebase not configured)`);
      return null;
    }
  } catch (error) {
    console.error('Error getting group conversation ID:', error);
    return null;
  }
};

module.exports = {
  sendSystemMessage,
  updateGroupMembers,
  getGroupConversationId,
  db
};



