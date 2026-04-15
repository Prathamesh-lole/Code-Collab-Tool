# 🚀 Real-Time Code Collaboration Platform

A full-stack, production-ready web application that enables multiple users to **collaborate on code in real-time**, similar to Google Docs and VS Code Live Share.  

Users can join shared rooms, write code together, communicate via chat, track each other's cursor movements, and execute code instantly — all in a seamless and interactive environment.

---

## 🌟 Key Features

### 👥 Real-Time Collaboration
- Multi-user coding in shared rooms
- Join via unique Room Key or shareable link
- Live user presence tracking

### ⚡ Live Code Synchronization
- Instant code updates across all users
- Conflict-free real-time editing
- Language synchronization

### 🧑‍💻 Advanced Code Editor
- Monaco Editor (VS Code-like experience)
- Syntax highlighting & IntelliSense
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

### 🎯 Cursor Tracking (Google Docs Style)
- Live cursor movement tracking
- Unique color for each user
- Username labels near cursors

### ▶️ Code Execution Engine
- Execute code in real-time
- Multi-language support
- Custom input (stdin)
- Output shared with all participants

### 🔐 Authentication & Security
- Secure login/signup system
- JWT-based authentication
- Protected routes and sessions

### 🎨 Modern UI/UX
- Responsive design (desktop + mobile)
- User avatars
- Highlight active user
- Smooth interactions and animations

### 🚀 Performance Optimizations
- Debounced socket events
- Optimized rendering
- Efficient state management

---

## 🛠️ Tech Stack

### 🎨 Frontend
- React.js
- Monaco Editor
- Socket.IO Client
- React Router
- CSS (Custom styling)

### ⚙️ Backend
- Node.js
- Express.js
- Socket.IO

### 🗄️ Database
- MongoDB (Mongoose ODM)

### 🔐 Authentication
- JSON Web Token (JWT)

Frontend (React + Monaco Editor)
↓
Socket.IO (WebSockets)
↓
Backend (Node.js + Express)
↓
MongoDB (Database)


---

## ⚙️ Application Flow

### 🔹 1. Authentication
- User signs up or logs in
- JWT token is generated and stored

---

### 🔹 2. Room Management
- User creates or joins a room using a unique Room Key
- Room data is fetched from the database

---

### 🔹 3. Real-Time Collaboration

#### Code Sync Flow:

User A types → Socket emit → Server → Broadcast → User B updates


#### Chat Flow:

User sends message → Server → Broadcast → All users receive


#### Cursor Tracking Flow:

User moves cursor → Emit → Server → Broadcast → Render for others


---

### 🔹 4. Code Execution

Frontend → API → Backend → Execute → Return Output → Broadcast


---

### 🔹 5. Data Persistence
- Code and language stored in MongoDB
- Room state maintained across sessions

---

## 📦 Installation & Setup

### 🔹 1. Clone the Repository

```bash
git clone https://github.com/your-username/real-time-code-collab.git
cd real-time-code-collab
🔹 2. Backend Setup
cd backend
npm install

Create .env file:

PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key

Run backend:

npm start
🔹 3. Frontend Setup
cd frontend
npm install
npm start
