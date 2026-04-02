const express = require("express");
const router = express.Router();
const {
  getFiles,
  createFile,
  updateFileCode,
  updateFileLanguage,
  deleteFile,
} = require("../controllers/fileController");

router.get("/:roomKey/files", getFiles);
router.post("/:roomKey/files", createFile);
router.put("/files/:fileId/code", updateFileCode);
router.put("/files/:fileId/language", updateFileLanguage);
router.delete("/files/:fileId", deleteFile);

module.exports = router;
