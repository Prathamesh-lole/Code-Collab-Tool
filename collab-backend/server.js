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

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/code", codeRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
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

  // send message
  socket.on("send_message", ({ roomId, messageData }) => {
  io.to(roomId).emit("receive_message", messageData);
  });

  // typing indicator
  socket.on("typing", ({ roomId, user }) => {
  socket.to(roomId).emit("user_typing", user);
  });

  // cursor movement
  socket.on("cursor_move", ({ roomId, name, position }) => {
  socket.to(roomId).emit("cursor_update", { name, position });
  });

  // When user disconnects
  socket.on("disconnect", () => {
    const roomId = socket.roomId;

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

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