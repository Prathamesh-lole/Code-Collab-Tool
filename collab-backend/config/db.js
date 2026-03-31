const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "2005@prlole22",
  database: "collab_code",
});

db.connect((err) => {
  if (err) {
    console.log("DB connection failed", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;