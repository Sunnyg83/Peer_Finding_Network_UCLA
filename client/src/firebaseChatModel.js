// firebase backend
import { db } from './firebase';
import {
    // firestone functions
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  limit,
  writeBatch,
  getDoc
} from 'firebase/firestore';

export async function getOrCreateConversation(userIds, groupName = null) { // find/create chat
  try {
    const sortedUserIds = [...userIds].sort();
    const convRef = collection(db, 'conversations');
    // Find with these users
    const q = query(convRef, where('users', '==', sortedUserIds));
    const snapshot = await getDocs(q); // run query and get the results
    if (!snapshot.empty) {
      return snapshot.docs[0].id; // if alr exists, return the id
    }
    // Create new conversation
    const docRef = await addDoc(convRef, { 
      users: sortedUserIds,
      updatedAt: serverTimestamp(),
      unreadCount: {},  // Track unread counts per user
      lastMessage: null,
      ...(groupName && { groupName })
    });
    return docRef.id; // return new conv id
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    throw error;
  }
}
// Group conversation function
export async function getOrCreateGroupConversation(groupId, groupName, memberIds) {
  try {
    const convRef = collection(db, 'conversations');
    
    // Check if group conversation already exists
    const q = query(convRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id; // Return existing conversation
    }
    
    // Create new group conversation
    const docRef = await addDoc(convRef, { 
      users: memberIds,
      groupId: groupId,
      isGroup: true,
      groupName: groupName,
      updatedAt: serverTimestamp(),
      unreadCount: {},
      lastMessage: null
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error in getOrCreateGroupConversation:', error);
    throw error;
  }
}

// Send system message for group events
export async function sendGroupSystemMessage(conversationId, message, eventType = 'system') {
  try {
    const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId: 'system',
      text: message,
      createdAt: serverTimestamp(),
      readBy: [],
      eventType: eventType, // 'system', 'join', 'leave'
      isSystemMessage: true
    });
    
    // Update conversation metadata
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      updatedAt: serverTimestamp(),
      lastMessage: message
    });
  } catch (error) {
    console.error('Error sending system message:', error);
    throw error;
  }
}

export async function sendMessage(conversationId, senderId, text) { // send message
  try {
    const batch = writeBatch(db);
    
    // Add the message
    const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    batch.set(messageRef, {
      senderId,
      text,
      createdAt: serverTimestamp(),
      readBy: [senderId] // sender has read their own message
    });
    
    // Update conversation metadata efficiently
    const convRef = doc(db, 'conversations', conversationId);
    const convDoc = await getDoc(convRef);
    const convData = convDoc.data();
    const users = convData.users || [];
    
    // Update unread counts for other users
    const newUnreadCount = { ...(convData.unreadCount || {}) };
    users.forEach(userId => {
      if (userId !== senderId) {
        newUnreadCount[userId] = (newUnreadCount[userId] || 0) + 1;
      }
    });
    
    batch.update(convRef, {
      updatedAt: serverTimestamp(),
      lastMessage: text,
      unreadCount: newUnreadCount
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}



// red dot code 
// mark all messages in a conv as read when opened
export async function markConversationAsRead(conversationId, userId) {
  try {
    // First, reset the unread count for this user in the conversation
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Only update messages that haven't been read by this user
    // Use a more efficient query to get unread messages
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef, 
      where('readBy', 'not-in', [[userId]])  // Only get messages not read by this user
    );
    
    try {
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        
        snapshot.forEach(msgDoc => {
          const data = msgDoc.data();
          if (!data.readBy || !data.readBy.includes(userId)) { // check if user has read msg
            batch.update(doc(db, 'conversations', conversationId, 'messages', msgDoc.id), {
              readBy: [...(data.readBy || []), userId]
            });
          }
        });
        
        await batch.commit();
      }
    } catch (error) {
      // Fallback for complex queries that might not be supported
      console.log('Using fallback read marking method');
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      let batchCount = 0;
      
      snapshot.forEach(msgDoc => {
        const data = msgDoc.data();
        if (!data.readBy || !data.readBy.includes(userId)) {
          batch.update(doc(db, 'conversations', conversationId, 'messages', msgDoc.id), {
            readBy: [...(data.readBy || []), userId]
          });
          batchCount++;
          
          // Firestore batch limit is 500 operations
          if (batchCount >= 400) {
            batch.commit();
            batchCount = 0;
          }
        }
      });
      
      if (batchCount > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    console.error('Error in markConversationAsRead:', error);
    throw error;
  }
}

// Count unread messages for a user in all conversations - OPTIMIZED
export async function getUnreadCountForUser(userId) {
  try {
    const convRef = collection(db, 'conversations');
    const q = query(convRef, where('users', 'array-contains', userId));
    const convSnapshot = await getDocs(q);
    
    let totalUnread = 0;
    convSnapshot.docs.forEach(convDoc => {
      const data = convDoc.data();
      const unreadCount = data.unreadCount || {};
      totalUnread += unreadCount[userId] || 0;
    });
    
    return totalUnread;
  } catch (error) {
    console.error('Error in getUnreadCountForUser:', error);
    return 0;
  }
}
// end red dot code

export async function getUserConversations(userId) {
  try {
    const convRef = collection(db, 'conversations');
   
    // Get ALL conversations (both individual and group) that the user is part of
    const q = query(convRef, where('users', 'array-contains', userId)); // all conv user is
    const snapshot = await getDocs(q); // execute + wait for results
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // return array of user convs
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

export function listenForMessages(conversationId, callback) { // update UI with new messages
  try {
    console.log('Setting up real-time listener for conversation:', conversationId);
    
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt'),
      limit(50) // Only fetch the 50 most recent messages
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Received real-time update, messages count:', snapshot.docs.length);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      })); // convert to array (JS objs)
      callback(messages);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up message listener:', error);
    // Return a dummy unsubscribe function
    return () => {};
  }
}

// Update group members in conversation
export async function updateGroupMembers(conversationId, newMemberIds, action, userName = null) {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    
    // Update the users array
    await updateDoc(convRef, {
      users: newMemberIds,
      updatedAt: serverTimestamp()
    });
    
    // Send appropriate system message
    let systemMessage = '';
    if (action === 'join' && userName) {
      systemMessage = `${userName} joined the group`;
    } else if (action === 'leave' && userName) {
      systemMessage = `${userName} left the group`;
    } else if (action === 'remove' && userName) {
      systemMessage = `${userName} was removed from the group`;
    }
    
    if (systemMessage) {
      await sendGroupSystemMessage(conversationId, systemMessage, action);
    }
    
  } catch (error) {
    console.error('Error updating group members:', error);
    throw error;
  }
}

// Get group conversations for a user
export async function getUserGroupConversations(userId) {
  try {
    const convRef = collection(db, 'conversations');
    const q = query(
      convRef, 
      where('users', 'array-contains', userId),
      where('isGroup', '==', true)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user group conversations:', error);
    return [];
  }
}

// Get conversation ID for a specific group
export async function getGroupConversationId(groupId) {
  try {
    const convRef = collection(db, 'conversations');
    const q = query(convRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null; // No conversation exists for this group
  } catch (error) {
    console.error('Error getting group conversation ID:', error);
    return null;
  }
} 