const db = require("../config/db");

// Get all files for a room
exports.getFiles = (req, res) => {
  const { roomKey } = req.params;
  db.query(
    "SELECT id, name, language, code FROM files WHERE room_key = ? ORDER BY created_at ASC",
    [roomKey],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

// Create a new file
exports.createFile = (req, res) => {
  const { roomKey } = req.params;
  const { name, language = "javascript" } = req.body;

  if (!name) return res.status(400).json({ message: "File name is required" });

  const defaultCode = {
    javascript: "// " + name + "\n",
    python:     "# " + name + "\n",
    java:       "// " + name + "\n",
    cpp:        "// " + name + "\n",
    c:          "// " + name + "\n",
    typescript: "// " + name + "\n",
  };

  db.query(
    "INSERT INTO files (room_key, name, language, code) VALUES (?, ?, ?, ?)",
    [roomKey, name, language, defaultCode[language] || ""],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ id: result.insertId, name, language, code: defaultCode[language] || "" });
    }
  );
};

// Update file code
exports.updateFileCode = (req, res) => {
  const { fileId } = req.params;
  const { code } = req.body;
  db.query("UPDATE files SET code = ? WHERE id = ?", [code, fileId], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Saved" });
  });
};

// Update file language
exports.updateFileLanguage = (req, res) => {
  const { fileId } = req.params;
  const { language } = req.body;
  db.query("UPDATE files SET language = ? WHERE id = ?", [language, fileId], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Updated" });
  });
};

// Delete a file
exports.deleteFile = (req, res) => {
  const { fileId } = req.params;
  db.query("DELETE FROM files WHERE id = ?", [fileId], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Deleted" });
  });
};
