# UCLA Study Network - Client

This is the frontend for the UCLA Study Network, a web app to help Bruins find study partners, form groups, and ace their courses.

## Features
- Landing Page with UCLA branding
- User Registration & Login
- Edit Profile (courses, availability, year)
- Find Study Partners (peer matching)
- **Real-Time Chat** (1-on-1 messaging)
- **Unread Message Notifications** (red dot on messages icon)
- Dark/Light Mode toggle

## How Real-Time Chat Works
- When you open a chat with another user, a real-time Firestore listener is set up for that conversation.
- Any new messages sent by either user appear instantly in both users' chat windows—no refresh needed.
- Messages are stored in Firestore under a `conversations` collection, with a `messages` subcollection for each conversation.

## Unread Message Notifications
- If you have unread messages, a red dot appears on the messages icon in the top right.
- The unread count is updated on login, refresh, or after closing the chat/messages modal.
- When you open a chat, all messages in that conversation are marked as read and the red dot disappears if there are no other unread messages.

## How to Run (Development)

### Prerequisites
- Node.js and npm installed
- Backend server running (see below)

### 1. Install dependencies
```sh
npm install
```

### 2. Set API URL (optional)
By default, the frontend expects the backend at `http://127.0.0.1:5001`. To change this, create a `.env` file and set:
```
VITE_API_URL=http://localhost:5001
```

### 3. Start the frontend
```sh
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Backend Setup - Server
- The backend must be running for the app to work.
- See `../server/README.md` for backend setup instructions.
- Make sure MongoDB is running and the backend is started (usually on port 5001).

---

## Usage Tips
- **Landing Page**: Click "Get Started" to proceed to login or registration.
- **Edit Profile**: After updating your profile, the peer list will clear. Click "Find Peers" again to see updated matches.
- **No Matches**: If no one is registered for your courses, you'll see a message instead of an empty list.
- **Logout**: Click the "Logout" button in the dashboard header to sign out.

---

## Screenshots

**Dashboard**

![Dashboard](./screenshots/dashboard.png)

**Login**

![Login](./screenshots/login.png)

**Register**

![Register](./screenshots/register.png)

**Peer List**

![Peer List](./screenshots/peer.png)

---

## License
MIT
