const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

let poolConfig;

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host:     url.hostname,
      port:     parseInt(url.port) || 3306,
      user:     url.username,
      password: url.password,
      database: url.pathname.replace("/", ""),
      ssl:      { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      enableKeepAlive:    true,
      keepAliveInitialDelay: 10000,
    };
  } catch (e) {
    console.error("Invalid DATABASE_URL format:", e.message);
    process.exit(1);
  }
} else {
  poolConfig = {
    host:     process.env.DB_HOST || "localhost",
    user:     process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "collab_code",
    port:     parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 10000,
  };
}

const pool = mysql.createPool(poolConfig);

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("MySQL Connected ✅");
    connection.release();
  }
});

module.exports = pool;
