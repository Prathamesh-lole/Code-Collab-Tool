# Code-Collab

A full-stack, production-ready real-time collaborative coding platform. Multiple developers can share a room, write code together, chat, track each other's cursors, execute code instantly, and even voice/video call — all in one place.

Live demo: [code-collab-tool.vercel.app](https://code-collab-tool.vercel.app)

---

## Features

### Real-Time Collaboration
- Multi-user coding in shared rooms
- Join via unique Room Key or shareable link
- Live user presence tracking with coloured peer avatars

### Live Code Synchronization
- Instant code updates across all connected users
- Per-file sync with multi-file room support
- Language synchronization across participants

### Advanced Code Editor
- Monaco Editor (VS Code-quality experience)
- Syntax highlighting, IntelliSense, and ligatures (JetBrains Mono)
- Supports 6 languages: JavaScript, Python, Java, C++, C, TypeScript

### Real-Time Chat
- Instant messaging within rooms
- Typing indicators with auto-clear
- Timestamped messages with sender identification

### Cursor Tracking
- Live cursor movement tracking (Google Docs style)
- Unique colour per user with username labels
- 80ms debounced emit for performance

### Code Execution Engine
- JavaScript runs locally via `vm2` sandbox (fast, no external call)
- Python, Java, C++, C, TypeScript via Judge0 public API
- Custom stdin support
- Output broadcast to all participants in the room

### Voice & Video
- WebRTC peer-to-peer calls built in
- Mic mute and camera toggle
- STUN-based NAT traversal (Google STUN)

### Authentication
- Email/password with bcrypt hashing
- Google OAuth (Sign in with Google)
- JWT-based sessions with protected routes
- Welcome email via Nodemailer on registration

### UI/UX
- Dark-first design system (CODE//FLOW aesthetic)
- Plus Jakarta Sans + JetBrains Mono typography
- Ambient radial gradients + grid overlay
- Animated landing page with live peer simulation
- Toast notifications, activity log, loading states

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Real-time | Socket.IO 4 (client + server) |
| Backend | Node.js, Express 5 |
| Database | MySQL (`mysql2`, no ORM) |
| Auth | JWT, bcryptjs, Google OAuth (`google-auth-library`) |
| Code execution | `vm2` (JS), Judge0 CE API (other languages) |
| Voice/Video | WebRTC (native browser APIs) |
| Email | Nodemailer + Gmail |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```
Browser (React + Monaco)
        ↕  HTTP REST (fetch)
        ↕  WebSocket (Socket.IO)
Node.js + Express Server
        ↕
      MySQL
```

---

## Application Flow

**Authentication**
User registers or logs in → bcrypt verify → JWT issued → stored in localStorage

**Room Management**
Create room → unique room key generated → stored in MySQL
Join room → fetch room + files from DB → Socket.IO `join_room` emitted

**Real-Time Sync**
```
User A types → emit code_change → server → broadcast code_update → User B
User moves cursor → emit cursor_move (debounced 80ms) → broadcast cursor_update
User sends chat → emit send_message → server enriches → broadcast receive_message
```

**Code Execution**
```
Click Run → POST /api/code/run → vm2 (JS) or Judge0 API → output → broadcast output_update
```

**Voice/Video**
```
Join call → getUserMedia → RTCPeerConnection → SDP offer/answer via Socket.IO → P2P media
```

---

## Project Structure

```
Nodejs/
├── collab-backend/
│   ├── config/db.js            # MySQL connection
│   ├── controllers/
│   │   ├── authController.js   # Register, login, Google OAuth
│   │   ├── codeController.js   # Code execution (vm2 + Judge0)
│   │   ├── fileController.js   # File CRUD
│   │   └── roomController.js   # Room CRUD
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification
│   ├── routes/                 # Express routers
│   ├── socket/socket.js        # (placeholder)
│   ├── server.js               # Main server + Socket.IO
│   └── migrate.js              # DB table creation
│
└── collab-frontend/collab-frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx  # Public landing page
    │   │   ├── LoginPage.jsx    # Email + Google auth
    │   │   ├── RegisterPage.jsx # Registration + validation
    │   │   ├── HomePage.jsx     # Create / Join room
    │   │   └── RoomPage.jsx     # Full IDE (editor + chat + voice)
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   ├── App.jsx              # Routes
    │   ├── App.css
    │   └── index.css            # Global design system (CSS vars)
    └── vite.config.js
```

---

## Database Schema

```sql
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255),          -- NULL for Google OAuth users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  room_name  VARCHAR(100) NOT NULL,
  room_key   VARCHAR(20)  NOT NULL UNIQUE,
  created_by INT,
  code       LONGTEXT,
  language   VARCHAR(30) DEFAULT 'javascript',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  room_key   VARCHAR(20) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  language   VARCHAR(30) DEFAULT 'javascript',
  code       LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_key (room_key)
);
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- MySQL 8+
- A Google Cloud project with OAuth Client ID (free)

### 1. Clone the repository
```bash
git clone https://github.com/Prathamesh-lole/Code-Collab-Tool.git
cd Code-Collab-Tool
```

### 2. Backend setup
```bash
cd collab-backend
npm install
```

Create `.env` file:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=collab_code
DB_PORT=3306
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Create the database tables:
```bash
node migrate.js
```

Start the backend:
```bash
node server.js
```

### 3. Frontend setup
```bash
cd collab-frontend/collab-frontend
npm install
```

Create `.env` file:
```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Start the frontend:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `PORT` | backend | Server port (default 5000) |
| `DB_HOST` | backend | MySQL host |
| `DB_USER` | backend | MySQL username |
| `DB_PASSWORD` | backend | MySQL password |
| `DB_NAME` | backend | MySQL database name |
| `JWT_SECRET` | backend | Secret for signing JWTs |
| `FRONTEND_URL` | backend | Allowed CORS origin |
| `GOOGLE_CLIENT_ID` | backend | Google OAuth client ID |
| `VITE_API_URL` | frontend | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Google OAuth client ID |

---

## Google OAuth Setup (Free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth Client ID
3. Set **Authorized JavaScript origins**: `http://localhost:5173`
4. Set **Authorized redirect URIs**: `http://localhost:5173`
5. Go to **Audience** → add your Gmail as a test user
6. Copy the Client ID into both `.env` files

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register with email/password |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/google` | No | Google OAuth login |
| POST | `/api/rooms/create` | JWT | Create a new room |
| GET | `/api/rooms/key/:roomKey` | No | Get room data |
| PUT | `/api/rooms/key/:roomKey/code` | No | Save room code |
| PUT | `/api/rooms/key/:roomKey/language` | No | Save room language |
| GET | `/api/rooms/:roomKey/files` | No | List files in room |
| POST | `/api/rooms/:roomKey/files` | No | Create a file |
| PUT | `/api/rooms/files/:fileId/code` | No | Save file code |
| PUT | `/api/rooms/files/:fileId/language` | No | Save file language |
| DELETE | `/api/rooms/files/:fileId` | No | Delete a file |
| POST | `/api/code/run` | No | Execute code |

---

## Socket.IO Events

| Event (client → server) | Event (server → client) | Description |
|---|---|---|
| `join_room` | `room_users`, `user_joined` | Join a room |
| `code_change` | `code_update` | Sync code |
| `language_change` | `language_update` | Sync language |
| `file_code_change` | `file_code_update` | Per-file code sync |
| `file_created` | `file_created` | New file broadcast |
| `file_deleted` | `file_deleted` | File deletion broadcast |
| `send_message` | `receive_message` | Chat message |
| `typing` | `user_typing` | Typing indicator |
| `cursor_move` | `cursor_update` | Live cursor position |
| `output_change` | `output_update` | Execution output sync |
| `webrtc_offer` | `webrtc_offer` | WebRTC SDP offer relay |
| `webrtc_answer` | `webrtc_answer` | WebRTC SDP answer relay |
| `webrtc_ice_candidate` | `webrtc_ice_candidate` | ICE candidate relay |
| `webrtc_leave` | `webrtc_peer_left` | Call participant left |
