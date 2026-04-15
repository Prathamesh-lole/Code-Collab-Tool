const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const db = mysql.createConnection(
  process.env.DATABASE_URL
    ? process.env.DATABASE_URL  // Railway provides a full connection URL
    : {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "collab_code",
        port: process.env.DB_PORT || 3306,
      }
);

db.connect((err) => {
  if (err) {
    console.log("DB connection failed", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;