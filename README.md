# Peer_Finding_Network_UCLA

![Backend](https://img.shields.io/badge/Backend-Deployed%20on%20Fly.io-blue?style=for-the-badge&logo=fly) ![Frontend](https://img.shields.io/badge/Frontend-Deployed%20on%20Vercel-black?style=for-the-badge&logo=vercel)

---

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## Project Overview
The UCLA Peer-Finding Network is a full-stack web app that helps Bruins find study partners, form groups, and ace their courses. It features real-time chat, peer matching, profile management, study groups, and a modern, responsive UI with dark/light mode. The landing page is professionally designed with UCLA branding and highlights upcoming features.

---

## Screenshots
Login page MVP  
![Login Page](client/screenshots/login.png)

Register page MVP  
![Register Page](client/screenshots/register.png)

User dashboard  
![Dashboard Screenshot](client/screenshots/dashboard.png)

Peer finding  
![Peer finder](client/screenshots/peer.png)

---

## Features
- **Professional Landing Page** with UCLA branding and clear feature highlights
- **"Coming Soon" Badges** for future features (UCLA student verification, mobile app & notifications, personalized study groups)
- **User Registration & Login**
- **Edit Profile** (courses, availability, year)
- **Profile Picture Upload** (upload and display custom profile images - stored using AWS S3)
- **Find Study Partners** (peer matching by course)
- **Real-Time Chat** (1-on-1 messaging, instant updates)
- **Unread Message Notifications** (red dot on messages icon)
- **Dark/Light Mode** toggle
- **Responsive Design** for all devices
- **Framer Motion Animations** (smooth entrance, hover, and scroll-triggered animations)

### Study Groups (New!)
- **Create Study Groups** - Form study groups with specific courses, invite peers, set member limits
- **My Study Groups** - View and manage groups you're a member of
- **Group Chat** - Real-time messaging for all group members
- **Browse Available Groups** - Find and join existing groups for your courses
- **Leave Groups** - Leave groups with automatic ownership transfer
- **System Messages** - Automatic notifications when members join/leave groups

### Enhanced Chat Features
- **Individual Chat** - 1-on-1 messaging with real-time updates
- **Group Chat** - Multi-user conversations with member management
- **Unread Counts** - Separate tracking for individual vs. group chats
- **Message History** - Persistent chat history for all conversations
- **Real-time Updates** - Instant message delivery and status updates

---

## How It Works

### Real-Time Chat
- When you open a chat, a real-time Firestore listener is set up for that conversation.
- Any new messages sent by either user appear instantly in both users' chat windows—no refresh needed.
- Messages are stored in Firestore under a `conversations` collection, with a `messages` subcollection for each conversation.

### Study Groups
- **Creation**: Choose a course, set group name and size, invite peers from your course matches
- **Management**: View all your groups, open group chats, leave groups
- **Discovery**: Browse available groups for courses you're taking
- **Real-time Updates**: Group member changes and system messages update instantly

### Group Chat System
- **Automatic Setup**: Firebase conversations are created automatically when groups are formed
- **Member Management**: Real-time updates when people join/leave groups
- **System Messages**: Automatic notifications like "Sarah joined the group" or "John left the group"
- **Persistent History**: All group messages are saved and accessible

### Unread Message Notifications
- **Individual Chats**: Red dot on Messages button shows unread individual messages
- **Group Chats**: Red dot on My Groups button shows unread group messages
- **Smart Updates**: Counts update automatically when opening/closing chats
- **Visual Indicators**: "New Messages" badges on group cards

---

## Getting Started

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd Peer_Finding_Network_UCLA
```

### 2. Set up the backend
```bash
cd server
npm install
# Create a .env file with your MongoDB URI and PORT
npm run dev
```

### 3. Set up the frontend
```bash
cd ../client
npm install
npm run dev
```

### 4. Open your browser
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend test route: [http://localhost:5001/api/test](http://localhost:5001/api/test)

---

## Configuration

### Frontend Environment
- Frontend uses `client/src/config.js` which reads `VITE_API_URL` and falls back to `http://127.0.0.1:5001`.
- Development (client/.env.local):
  ```
  VITE_API_URL=http://127.0.0.1:5001
  ```
- Production (client/.env.production):
  ```
  VITE_API_URL=<your-prod-backend-url>
  ```
- Rebuild the frontend after changing env: `npm run build` (or restart Vite in dev).

### Firebase Configuration (Optional)
- **System Messages**: Currently logs to console (Firebase Admin needs configuration)
- **To Enable**: Add Firebase service account key to `server/firebaseAdmin.js`
- **Fallback**: System messages appear in server logs when Firebase not configured

---

## Backend Setup - Server

### Required Dependencies
- **MongoDB** - User and group data storage
- **Express.js** - API server and routing
- **Firebase Admin** - Optional, for system messages and group management

### API Routes
- **User Management**: `/api/users/*` - Registration, login, profile updates
- **Study Groups**: `/api/groups/*` - Create, join, leave, manage groups
- **Peer Finding**: `/api/users/peers` - Find study partners by course

### Group Management Endpoints
- `POST /api/groups/create` - Create new study group
- `GET /api/groups/user/:userId` - Get user's groups
- `GET /api/groups/course/:course` - Find groups by course
- `POST /api/groups/:id/join` - Join existing group
- `POST /api/groups/:id/leave` - Leave group (with ownership transfer)

---

## Usage Tips

### General
- **Landing Page**: Click "Get Started" to proceed to login or registration.
- **Edit Profile**: After updating your profile, the peer list will clear. Click "Find Peers" again to see updated matches.
- **No Matches**: If no one is registered for your courses, you'll see a message instead of an empty list.
- **Logout**: Click the "Logout" button in the dashboard header to sign out.

### Study Groups
- **Create Study Group**: Choose a course from your `coursesSeeking`, select members, set max size, and create.
- **My Groups**: Shows groups you belong to. From here you can:
  - Open group chat for real-time messaging
  - Leave groups (automatic ownership transfer handled)
  - See member lists and group details
- **Browse Available Groups**: Lists available groups for your courses, excluding groups you're already in
- **Group Chat**: Real-time messaging with all group members, automatic system messages

### Chat Features
- **Individual Chats**: Click "Chat with [Name]" on peer cards
- **Group Chats**: Click "Group Chat" button in My Groups modal
- **Unread Notifications**: Red dots show new messages on both buttons
- **Message History**: All conversations persist and are accessible anytime

### Notifications
- **Red Dots**: Appear on Messages and My Groups buttons for unread messages
- **New Messages Badge**: Shows on group cards when there are unread group messages
- **System Messages**: Automatic notifications in group chats for member changes

---

## Technical Details

### Frontend Architecture
- **React** with functional components and hooks
- **State Management**: useState for local state, useEffect for side effects
- **Real-time Updates**: Firebase listeners for instant message updates
- **Responsive Design**: CSS Grid and Flexbox with mobile-first approach

### Backend Architecture
- **Node.js/Express** REST API
- **MongoDB** with Mongoose ODM
- **Firebase Admin** for real-time features (optional)
- **Modular Routing** with separate route files for different features

### Database Models
- **User**: Profile info, courses, availability, authentication
- **StudyGroup**: Group details, members, courses, creator
- **Firebase Collections**: Conversations, messages, real-time updates

---

## License

[MIT](LICENSE)