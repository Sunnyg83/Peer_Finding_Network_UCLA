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
  onSnapshot
} from 'firebase/firestore';




export async function getOrCreateConversation(userIds, groupName = null) {
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

// Send message 
export async function sendMessage(conversationId, senderId, text) {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    text,
    createdAt: serverTimestamp()
  });
}

// Listen for messages in real time
export function listenForMessages(conversationId, callback) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt')
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data());
    callback(messages);
  });
} 