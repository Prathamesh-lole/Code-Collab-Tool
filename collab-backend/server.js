const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const codeRoutes = require("./routes/codeRoutes");
const fileRoutes = require("./routes/fileRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/rooms", fileRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const roomUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const token = socket.handshake.auth?.token;
  let currentUser = null;

  // Verify token and get user details
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      currentUser = {
        userId: decoded.id,
        name: decoded.name || decoded.email || "User",
        email: decoded.email,
      };
    } catch (error) {
      console.log("Invalid socket token");
    }
  }

  // Join room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);

    socket.roomId = roomId;
    socket.currentUser = currentUser;

    // If room not created in memory yet
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    // Avoid duplicate same socket entry
    const alreadyExists = roomUsers[roomId].some(
      (user) => user.socketId === socket.id
    );

    if (!alreadyExists) {
      roomUsers[roomId].push({
        socketId: socket.id,
        userId: currentUser?.userId || null,
        name: currentUser?.name || "Guest User",
        email: currentUser?.email || null,
      });

      // Notify others that a new user joined
      socket.to(roomId).emit("user_joined", {
        name: currentUser?.name || "Guest User",
      });
    }

    // Send updated users list to everyone in room
    io.to(roomId).emit("room_users", roomUsers[roomId]);

    console.log(`User joined room: ${roomId}`);
  });

  // Code sync
  socket.on("code_change", ({ roomId, code }) => {
    socket.to(roomId).emit("code_update", code);
  });

  // Language sync
  socket.on("language_change", ({ roomId, language }) => {
    socket.to(roomId).emit("language_update", language);
  });

  // Output sync
  socket.on("output_change", ({ roomId, output }) => {
    socket.to(roomId).emit("output_update", output);
  });

  // send message — use server-side name for the sender
  socket.on("send_message", ({ roomId, messageData }) => {
    const enriched = { ...messageData, sender: socket.currentUser?.name || messageData.sender };
    io.to(roomId).emit("receive_message", enriched);
  });

  // typing indicator
  socket.on("typing", ({ roomId, name }) => {
    socket.to(roomId).emit("user_typing", name);
  });

  // File system sync
  socket.on("file_created", ({ roomId, file }) => {
    socket.to(roomId).emit("file_created", file);
  });

  socket.on("file_switched", ({ roomId, fileId }) => {
    socket.to(roomId).emit("file_switched", fileId);
  });

  socket.on("file_code_change", ({ roomId, fileId, code }) => {
    socket.to(roomId).emit("file_code_update", { fileId, code });
  });

  socket.on("file_language_change", ({ roomId, fileId, language }) => {
    socket.to(roomId).emit("file_language_update", { fileId, language });
  });

  socket.on("file_deleted", ({ roomId, fileId }) => {
    socket.to(roomId).emit("file_deleted", fileId);
  });

  // WebRTC signaling — relay between peers
  socket.on("webrtc_offer", ({ roomId, offer, toSocketId }) => {
    io.to(toSocketId).emit("webrtc_offer", { offer, fromSocketId: socket.id, fromName: currentUser?.name || "Guest" });
  });

  socket.on("webrtc_answer", ({ answer, toSocketId }) => {
    io.to(toSocketId).emit("webrtc_answer", { answer, fromSocketId: socket.id });
  });

  socket.on("webrtc_ice_candidate", ({ candidate, toSocketId }) => {
    io.to(toSocketId).emit("webrtc_ice_candidate", { candidate, fromSocketId: socket.id });
  });

  socket.on("webrtc_leave", ({ roomId }) => {
    socket.to(roomId).emit("webrtc_peer_left", { socketId: socket.id });
  });

  // cursor movement — use server-side authenticated name to avoid mismatches
  socket.on("cursor_move", ({ roomId, position, color }) => {
    const name = socket.currentUser?.name || "Guest User";
    socket.to(roomId).emit("cursor_update", { name, position, color });
  });

  // When user disconnects
  socket.on("disconnect", () => {
    const roomId = socket.roomId;

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      // Notify others that user left
      socket.to(roomId).emit("user_left", {
        name: currentUser?.name || "Guest User",
      });

      // Send updated list after removing user
      io.to(roomId).emit("room_users", roomUsers[roomId]);

      // Remove room if empty
      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running with Socket.IO on port ${PORT}`);
});