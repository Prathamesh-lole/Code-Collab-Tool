#  🚀 Code-Collab — Real-Time Collaborative Studio

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
