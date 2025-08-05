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