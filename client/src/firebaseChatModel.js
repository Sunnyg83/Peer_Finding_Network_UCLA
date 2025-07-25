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
  doc
} from 'firebase/firestore';




export async function getOrCreateConversation(userIds, groupName = null) { // find/create chat
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
    ...(groupName && { groupName })
  });
  return docRef.id; // return new conv id
}


export async function sendMessage(conversationId, senderId, text) { // send message
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    text,
    createdAt: serverTimestamp(),
    readBy: [senderId] // sender has read their own message
  });
}

// red dot code
// mark all messages in a conv as read when opened
export async function markConversationAsRead(conversationId, userId) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const snapshot = await getDocs(messagesRef);
  const updates = [];
  snapshot.forEach(msgDoc => {
    const data = msgDoc.data();
    if (!data.readBy || !data.readBy.includes(userId)) {
      updates.push(updateDoc(doc(db, 'conversations', conversationId, 'messages', msgDoc.id), {
        readBy: [...(data.readBy || []), userId]
      }));
    }
  });
  await Promise.all(updates);
}

// Count unread messages for a user in all conversations
export async function getUnreadCountForUser(userId) {
  const convRef = collection(db, 'conversations');
  const q = query(convRef, where('users', 'array-contains', userId));
  const convSnapshot = await getDocs(q);
  let totalUnread = 0;
  for (const convDoc of convSnapshot.docs) {
    const messagesRef = collection(db, 'conversations', convDoc.id, 'messages');
    const msgSnapshot = await getDocs(messagesRef);
    msgSnapshot.forEach(msgDoc => {
      const data = msgDoc.data();
      if (!data.readBy || !data.readBy.includes(userId)) {
        totalUnread++;
      }
    });
  }
  return totalUnread;
}
// end red dot code


export async function getUserConversations(userId) {
  const convRef = collection(db, 'conversations');
 
  const q = query(convRef, where('users', 'array-contains', userId)); // all conv user is
  const snapshot = await getDocs(q); // execute + wait for results
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // return array of user convs
}


export function listenForMessages(conversationId, callback) { // update UI with new messages
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt')
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data()); // convert to array (JS objs)
    callback(messages);
  });
} 