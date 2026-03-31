const db = require("../config/db");

// Generate random room key like abc-4k9m-x2p
const generateRoomKey = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

  const part = (length) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  return `${part(3)}-${part(4)}-${part(3)}`;
};

// Create room
exports.createRoom = (req, res) => {
  const { room_name } = req.body;
  const userId = req.user.id;

  const defaultCode = "// Start coding here...";
  const defaultLanguage = "javascript";
  const roomKey = generateRoomKey();

  db.query(
    "INSERT INTO rooms (room_name, created_by, code, language, room_key) VALUES (?, ?, ?, ?, ?)",
    [room_name, userId, defaultCode, defaultLanguage, roomKey],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Room created successfully",
        roomId: result.insertId,
        roomKey: roomKey,
      });
    }
  );
};

// Get room by room_key
exports.getRoomByKey = (req, res) => {
  const { roomKey } = req.params;

  db.query(
    "SELECT * FROM rooms WHERE room_key = ?",
    [roomKey],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(result[0]);
    }
  );
};

// Update room code by room_key
exports.updateRoomCodeByKey = (req, res) => {
  const { roomKey } = req.params;
  const { code } = req.body;

  db.query(
    "UPDATE rooms SET code = ? WHERE room_key = ?",
    [code, roomKey],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Code updated successfully" });
    }
  );
};

// Update room language by room_key
exports.updateRoomLanguageByKey = (req, res) => {
  const { roomKey } = req.params;
  const { language } = req.body;

  db.query(
    "UPDATE rooms SET language = ? WHERE room_key = ?",
    [language, roomKey],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Language updated successfully" });
    }
  );
};