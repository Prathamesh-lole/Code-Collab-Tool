const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createRoom,
  getRoomByKey,
  updateRoomCodeByKey,
  updateRoomLanguageByKey,
} = require("../controllers/roomController");

router.post("/create", authMiddleware, createRoom);
router.get("/key/:roomKey", getRoomByKey);
router.put("/key/:roomKey/code", updateRoomCodeByKey);
router.put("/key/:roomKey/language", updateRoomLanguageByKey);

module.exports = router;