# Code-Collab — Real-Time Collaborative Studio

A full-stack, production-ready web application that enables multiple users to collaborate on code in real-time, similar to Google Docs and VS Code Live Share. Users can join shared rooms, write code together, communicate via chat, track each other's cursor movements, and execute code instantly.

---

## 🌟 Key Features

### 👥 Real-Time Collaboration
- Multi-user coding in shared rooms
- Join via unique Room Key or shareable link
- Live user presence tracking with colored avatars

### ⚡ Live Code Synchronization
- Instant code updates across all users
- Conflict-free real-time editing
- Per-file language synchronization

### 🧑‍💻 Advanced Code Editor
- Monaco Editor (VS Code-like experience)
- Syntax highlighting & IntelliSense
- Custom autocomplete for all supported languages
- Supports multiple languages:
  - JavaScript
  - Python
  - Java
  - C++
  - C
  - TypeScript

### 💬 Real-Time Chat System
- Instant messaging within rooms
- Typing indicators
- Timestamped messages
- Sender identification

### 🎯 Live Cursor Tracking
- Real-time cursor movement across all collaborators
- Unique color per user
- Username labels rendered as Monaco decorations

### ▶️ Code Execution Engine
- Execute code directly in the browser
- JavaScript runs locally via vm2 (sandboxed, fast)
- Python, Java, C++, C, TypeScript run via Judge0 CE API
- Custom stdin input support
- Output shared with all room participants

### 🎙 Voice & Video Calls
- WebRTC peer-to-peer voice and video
- Built-in call controls (mute, camera toggle, leave)
- No third-party service required

### 📁 Multi-File Rooms
- Create and manage multiple files per room
- Each file has its own language and code state
- File changes sync instantly across all users

### 🔐 Authentication & Security
- Email/password registration and login
- Google OAuth (Sign in with Google)
- JWT-based session management
- Protected routes
- Welcome email on registration via Nodemailer

### 🎨 Modern UI/UX
- Dark-first design system (CODE//FLOW aesthetic)
- Plus Jakarta Sans + JetBrains Mono typography
- Animated landing page with live peer simulation
- Responsive layout with ambient glow effects

---

## 🛠️ Tech Stack

### Frontend
- React 19
- Monaco Editor (`@monaco-editor/react`)
- Socket.IO Client
- React Router v7
- Vite 8
- Custom CSS (inline JS styles + global design tokens)

### Backend
- Node.js
- Express.js v5
- Socket.IO v4
- mysql2 (raw SQL, no ORM)
- jsonwebtoken (JWT)
- bcryptjs
- google-auth-library (Google OAuth)
- vm2 (sandboxed JS execution)
- axios (Judge0 API)
- nodemailer (welcome emails)

### Database
- MySQL

### Authentication
- JWT (JSON Web Tokens)
- Google OAuth 2.0

---

## 🗄️ Database Schema

```sql
users  (id, name, email, password, created_at)
rooms  (id, room_name, room_key, created_by, code, language, created_at)
files  (id, room_key, name, language, code, created_at)
⚙️ Architecture

Browser (React + Monaco)
        ↕ REST API (fetch)
        ↕ WebSockets (Socket.IO)
Node.js + Express Server
        ↕
      MySQL
Application Flow
1. Authentication

User registers or logs in (email/password or Google OAuth)
JWT token stored in localStorage
Protected routes check token on every navigation
2. Room Management

User creates a room → unique room key generated
User joins a room by entering the room key
Room data (files, language, code) fetched from MySQL
3. Real-Time Collaboration


Code sync:     User types → emit code_change → server → broadcast → all users update
File sync:     File created/switched/deleted → emit → server → broadcast
Chat:          Message sent → emit send_message → server → broadcast receive_message
Cursor:        Cursor moves → debounced emit cursor_move → server → broadcast cursor_update
4. Code Execution


Frontend → POST /api/code/run → Backend
  → JavaScript: vm2 sandbox (local, fast)
  → Others: Judge0 CE API (polling)
  → Output → broadcast output_change → all users see result
5. Voice & Video


User joins call → getUserMedia → RTCPeerConnection per peer
  → SDP offer/answer via Socket.IO signaling
  → ICE candidates exchanged
  → Peer-to-peer media stream established
📦 Installation & Setup
1. Clone the Repository
bash

git clone https://github.com/Prathamesh-lole/Code-Collab-Tool.git
cd Code-Collab-Tool
2. Backend Setup
bash

cd collab-backend
npm install
Create .env file:


PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=collabdb
DB_PORT=3306
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password
Run migrations (first time only):

bash

node migrate.js
Start the server:

bash

node server.js
Backend runs on http://localhost:5000

3. Frontend Setup
bash

cd collab-frontend/collab-frontend
npm install
Create .env file:


VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
Start the dev server:

bash

npm run dev
Frontend runs on http://localhost:5173

🔐 Google OAuth Setup
Go to console.cloud.google.com
Create a project → APIs & Services → Credentials
Create OAuth 2.0 Client ID (Web application)
Add to Authorized JavaScript origins: http://localhost:5173
Add to Authorized redirect URIs: http://localhost:5173
Go to Audience → add your Gmail as a test user
Copy the Client ID into both .env files
📁 Project Structure

Code-Collab-Tool/
├── collab-backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── codeController.js
│   │   ├── fileController.js
│   │   └── roomController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── codeRoutes.js
│   │   ├── fileRoutes.js
│   │   └── roomRoutes.js
│   ├── socket/
│   │   └── socket.js
│   ├── server.js
│   ├── migrate.js
│   └── package.json
│
└── collab-frontend/collab-frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── HomePage.jsx
    │   │   └── RoomPage.jsx
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   ├── App.jsx
    │   ├── App.css
    │   └── index.css
    ├── index.html
    └── package.json
🚀 Live Demo
Frontend: code-collab-tool.vercel.app
