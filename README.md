# CodeCollab — Real-Time Code Collaboration Tool

A full-stack real-time collaborative code editor built with React, Node.js, Socket.IO, and Monaco Editor.

## Features

- Real-time code sync across all users
- Multi-language support: JavaScript, Python, Java, C++, C, TypeScript
- Code execution engine (JS runs locally, others via Judge0 CE)
- Live cursor tracking with colored labels per user
- Multi-file tabs per room
- Real-time chat with typing indicators
- Voice & video calling via WebRTC
- User presence (join/leave toasts, online list)
- JWT authentication

## Project Structure

```
collab-backend/    → Express + Socket.IO + MySQL
collab-frontend/   → React + Vite + Monaco Editor
```

## Setup

### Backend

```bash
cd collab-backend
npm install
cp .env.example .env   # fill in your values
npm run dev
```

### Frontend

```bash
cd collab-frontend/collab-frontend
npm install
npm run dev
```

### Database

Run this SQL to create the required tables:

```sql
CREATE DATABASE collab_code;
USE collab_code;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(100),
  room_key VARCHAR(20) UNIQUE,
  created_by INT,
  code LONGTEXT,
  language VARCHAR(30) DEFAULT 'javascript',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_key VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  language VARCHAR(30) DEFAULT 'javascript',
  code LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_key (room_key)
);
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Monaco Editor, Socket.io-client |
| Backend | Node.js, Express, Socket.IO |
| Database | MySQL |
| Auth | JWT |
| Code Execution | vm2 (JS), Judge0 CE API (others) |
| Real-time | WebRTC (voice/video), Socket.IO (sync) |
