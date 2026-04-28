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

const allowedOrigins = [
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : null,
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin.endsWith(".onrender.com")) return true;
  if (allowedOrigins.includes(origin)) return true;
  return false;
};

const corsOptions = {
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/rooms", fileRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const roomUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const token = socket.handshake.auth ? socket.handshake.auth.token : null;
  let currentUser = null;

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

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.currentUser = currentUser;

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    const alreadyExists = roomUsers[roomId].some(
      (user) => user.socketId === socket.id
    );

    if (!alreadyExists) {
      roomUsers[roomId].push({
        socketId: socket.id,
        userId: currentUser ? currentUser.userId : null,
        name: currentUser ? currentUser.name : "Guest User",
        email: currentUser ? currentUser.email : null,
      });

      socket.to(roomId).emit("user_joined", {
        name: currentUser ? currentUser.name : "Guest User",
      });
    }

    io.to(roomId).emit("room_users", roomUsers[roomId]);
    console.log("User joined room: " + roomId);
  });

  socket.on("code_change", function(data) {
    socket.to(data.roomId).emit("code_update", data.code);
  });

  socket.on("language_change", function(data) {
    socket.to(data.roomId).emit("language_update", data.language);
  });

  socket.on("output_change", function(data) {
    socket.to(data.roomId).emit("output_update", data.output);
  });

  socket.on("send_message", function(data) {
    var enriched = Object.assign({}, data.messageData, {
      sender: socket.currentUser ? socket.currentUser.name : data.messageData.sender,
    });
    io.to(data.roomId).emit("receive_message", enriched);
  });

  socket.on("typing", function(data) {
    socket.to(data.roomId).emit("user_typing", data.name);
  });

  socket.on("file_created", function(data) {
    socket.to(data.roomId).emit("file_created", data.file);
  });

  socket.on("file_switched", function(data) {
    socket.to(data.roomId).emit("file_switched", data.fileId);
  });

  socket.on("file_code_change", function(data) {
    socket.to(data.roomId).emit("file_code_update", { fileId: data.fileId, code: data.code });
  });

  socket.on("file_language_change", function(data) {
    socket.to(data.roomId).emit("file_language_update", { fileId: data.fileId, language: data.language });
  });

  socket.on("file_deleted", function(data) {
    socket.to(data.roomId).emit("file_deleted", data.fileId);
  });

  socket.on("webrtc_offer", function(data) {
    io.to(data.toSocketId).emit("webrtc_offer", {
      offer: data.offer,
      fromSocketId: socket.id,
      fromName: currentUser ? currentUser.name : "Guest",
    });
  });

  socket.on("webrtc_answer", function(data) {
    io.to(data.toSocketId).emit("webrtc_answer", { answer: data.answer, fromSocketId: socket.id });
  });

  socket.on("webrtc_ice_candidate", function(data) {
    io.to(data.toSocketId).emit("webrtc_ice_candidate", { candidate: data.candidate, fromSocketId: socket.id });
  });

  socket.on("webrtc_leave", function(data) {
    socket.to(data.roomId).emit("webrtc_peer_left", { socketId: socket.id });
  });

  socket.on("cursor_move", function(data) {
    var name = socket.currentUser ? socket.currentUser.name : "Guest User";
    socket.to(data.roomId).emit("cursor_update", { name: name, position: data.position, color: data.color });
  });

  socket.on("disconnect", () => {
    var roomId = socket.roomId;

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      socket.to(roomId).emit("user_left", {
        name: currentUser ? currentUser.name : "Guest User",
      });

      io.to(roomId).emit("room_users", roomUsers[roomId]);

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Server running with Socket.IO on port " + PORT);
});
