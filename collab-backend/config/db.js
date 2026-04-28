const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

let connectionConfig;

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    connectionConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace("/", ""),
    };
  } catch (e) {
    console.error("Invalid DATABASE_URL format:", e.message);
    process.exit(1);
  }
} else {
  connectionConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "collab_code",
    port: parseInt(process.env.DB_PORT) || 3306,
  };
}

const db = mysql.createConnection(connectionConfig);

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;
