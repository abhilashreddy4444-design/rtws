require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UAParser = require("ua-parser-js");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

app.set("trust proxy", true);

app.use(express.json());
app.use(express.static("public"));

// ==============================
// DDoS Detection
// ==============================
let requestTracker = {};
const REQUEST_LIMIT = 10;
const TIME_WINDOW = 10 * 1000;

app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  if (!requestTracker[ip]) requestTracker[ip] = [];

  requestTracker[ip] = requestTracker[ip].filter(
    t => now - t < TIME_WINDOW
  );

  requestTracker[ip].push(now);

  if (requestTracker[ip].length > REQUEST_LIMIT) {
    logAttack(req, "High request rate detected", "DDoS Attack");
    return res.status(429).json({
      success: false,
      message: "Too many requests. Possible DDoS detected."
    });
  }

  next();
});

// ==============================
// MongoDB
// ==============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ==============================
// Schemas
// ==============================
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const attackSchema = new mongoose.Schema({
  ip: String,
  url: String,
  type: String,
  payload: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  device: String,
  country: String,
  time: { type: Date, default: Date.now }
}, { versionKey: false });

const User = mongoose.model("User", userSchema);
const Attack = mongoose.model("Attack", attackSchema);

// ==============================
// Patterns
// ==============================
const sqlPattern = /(\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b|--|' OR 1=1|;)/i;
const xssPattern = /(<script>|<\/script>|javascript:|onerror=|onload=|<img)/i;

// ==============================
// Brute Force Protection
// ==============================
let loginAttempts = {};
const BRUTE_LIMIT = 3;
const BRUTE_WINDOW = 60 * 1000;

// ==============================
// Logger (Improved Version Detection)
// ==============================
async function logAttack(req, payload, type) {

  const rawUA = req.headers["user-agent"] || "";
  const parser = new UAParser(rawUA);
  const ua = parser.getResult();

  const browser = ua.browser.name || "Unknown";
  const browserVersion = ua.browser.version || "Unknown";

  const os = ua.os.name || "Unknown";
  const osVersion = ua.os.version || "Unknown";

  const device = ua.device.type || "Desktop";

  let country = "Unknown";

  try {
    const response = await axios.get(`http://ip-api.com/json/${req.ip}`);
    country = response.data.country || "Unknown";
  } catch {}

  await new Attack({
    ip: req.ip,
    url: req.originalUrl,
    type,
    payload,
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    country
  }).save();
}

// ==============================
// LOGIN
// ==============================
app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  if (sqlPattern.test(email) || sqlPattern.test(password)) {
    await logAttack(req, JSON.stringify(req.body), "SQL Injection (Login)");
    return res.json({ success: false });
  }

  const user = await User.findOne({ email });

  if (!user) {
    await logAttack(req, email, "Invalid Email Attempt");
    return res.json({ success: false });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {

    const key = req.ip + "_" + email;
    const now = Date.now();

    if (!loginAttempts[key]) {
      loginAttempts[key] = { count: 0, firstAttempt: now };
    }

    if (now - loginAttempts[key].firstAttempt > BRUTE_WINDOW) {
      loginAttempts[key] = { count: 0, firstAttempt: now };
    }

    loginAttempts[key].count++;

    if (loginAttempts[key].count === BRUTE_LIMIT) {
      await logAttack(req, email, "Brute Force Attack");
    }

    return res.json({ success: false });
  }

  delete loginAttempts[req.ip + "_" + email];

  res.json({ success: true, username: user.username });
});

// ==============================
// ADMIN DATA
// ==============================
app.get("/admin-data", async (req, res) => {
  const attacks = await Attack.find().sort({ time: -1 });

  res.json({
    total: attacks.length,
    sqlCount: attacks.filter(a => a.type.includes("SQL")).length,
    xssCount: attacks.filter(a => a.type.includes("XSS")).length,
    bruteCount: attacks.filter(a => a.type.includes("Brute")).length,
    adminScanCount: attacks.filter(a => a.type.includes("Admin Scan")).length,
    ddosCount: attacks.filter(a => a.type.includes("DDoS")).length,
    attacks
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));