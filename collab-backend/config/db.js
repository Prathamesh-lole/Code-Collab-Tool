const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

let db;

if (process.env.DATABASE_URL) {
  // Railway provides a full MySQL connection URL
  db = mysql.createConnection(process.env.DATABASE_URL);
} else {
  db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "collab_code",
    port: process.env.DB_PORT || 3306,
  });
}

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;
