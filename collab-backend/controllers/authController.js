const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Email transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Send welcome email ─────────────────────────────────────────
const sendWelcomeEmail = async (name, email) => {
  const mailOptions = {
    from: `"CodeCollab" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to CodeCollab!",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0d1117; color: #f0f6fc; padding: 40px; border-radius: 12px; max-width: 520px; margin: auto;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e;"></div>
          <span style="font-size: 18px; font-weight: 700; color: #f0f6fc;">CodeCollab</span>
        </div>

        <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 12px 0; color: #f0f6fc;">
          Welcome, ${name}! 🎉
        </h1>

        <p style="font-size: 15px; color: #8b949e; line-height: 1.7; margin: 0 0 24px 0;">
          Your account has been created successfully. You can now start collaborating with your team in real-time.
        </p>

        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #6e7681; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;">What you can do</p>
          <ul style="margin: 0; padding-left: 18px; color: #8b949e; font-size: 14px; line-height: 2;">
            <li>Create or join coding rooms instantly</li>
            <li>Write code together in real-time</li>
            <li>Run JavaScript, Python, Java, C++, C, TypeScript</li>
            <li>Chat and video call with your team</li>
          </ul>
        </div>

        <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: #238636; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
          Start Coding Now
        </a>

        <p style="margin-top: 32px; font-size: 12px; color: #6e7681;">
          If you did not create this account, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to:", email);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
};

// ── Validation helpers ─────────────────────────────────────────
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  return errors;
};

// ── Sign JWT ───────────────────────────────────────────────────
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ── Register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validations
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters" });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  const passwordErrors = validatePassword(password || "");
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      message: "Password must contain " + passwordErrors.join(", "),
    });
  }

  // Check if email already exists
  db.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), email.toLowerCase(), hashedPassword],
      async (err2, insertResult) => {
        if (err2) return res.status(500).json({ message: "Failed to create account" });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(name.trim(), email.toLowerCase());

        res.json({ message: "Account created successfully! Please login." });
      }
    );
  });
};

// ── Login ──────────────────────────────────────────────────────
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length === 0) {
      return res.status(400).json({ message: "No account found with this email" });
    }

    const user = result[0];

    // Google-only accounts have no password
    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google login. Please sign in with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = signToken(user);

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
};

// ── Google OAuth ───────────────────────────────────────────────
exports.googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    // Check if user already exists
    db.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], async (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });

      let user;

      if (result.length > 0) {
        // Existing user — just log them in
        user = result[0];
      } else {
        // New user — create account (no password for Google users)
        const insertResult = await new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email.toLowerCase(), null],
            (err2, res2) => {
              if (err2) reject(err2);
              else resolve(res2);
            }
          );
        });

        user = { id: insertResult.insertId, name, email: email.toLowerCase() };

        // Send welcome email for new Google users
        sendWelcomeEmail(name, email.toLowerCase());
      }

      const token = signToken(user);

      res.json({
        message: "Google login successful",
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ message: "Invalid Google credential" });
  }
};
