require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Trust proxy for Render
app.set("trust proxy", true);

app.use(express.json());
app.use(express.static("public"));

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
  time: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Attack = mongoose.model("Attack", attackSchema);

// ==============================
// Attack Patterns
// ==============================
const sqlPattern = /(\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b|--|' OR '1'='1|;)/i;
const xssPattern = /(<script>|<\/script>|javascript:|onerror=|onload=|<img)/i;

let loginAttempts = {};

// ==============================
// Honeypot Logger
// ==============================
async function logAttack(req, payload, type) {
  const newAttack = new Attack({
    ip: req.ip,
    url: req.originalUrl,
    type,
    payload
  });
  await newAttack.save();
  console.log(`🔥 ${type} detected from ${req.ip}`);
}

// ==============================
// REGISTER
// ==============================
app.post("/register", async (req, res) => {

  const { username, email, password } = req.body;

  if (sqlPattern.test(username) || sqlPattern.test(email) || sqlPattern.test(password)) {
    await logAttack(req, JSON.stringify(req.body), "SQL Injection (Register)");
    return res.json({ success: false, message: "Invalid input detected" });
  }

  if (xssPattern.test(username) || xssPattern.test(email)) {
    await logAttack(req, JSON.stringify(req.body), "XSS Attack (Register)");
    return res.json({ success: false, message: "Invalid input detected" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.json({ success: false, message: "User already exists!" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await new User({ username, email, password: hashedPassword }).save();

  res.json({ success: true, message: "Registration successful!" });
});

// ==============================
// LOGIN
// ==============================
app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  if (sqlPattern.test(email) || sqlPattern.test(password)) {
    await logAttack(req, JSON.stringify(req.body), "SQL Injection (Login)");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  if (xssPattern.test(email)) {
    await logAttack(req, JSON.stringify(req.body), "XSS Attack (Login)");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    await logAttack(req, email, "Invalid Email Attempt");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const ip = req.ip;

    loginAttempts[ip] = (loginAttempts[ip] || 0) + 1;

    if (loginAttempts[ip] >= 3) {
      await logAttack(req, email, "Brute Force Attack (3+ attempts)");
    }

    return res.json({ success: false, message: "Invalid credentials" });
  }

  loginAttempts[req.ip] = 0;

  res.json({ success: true, message: "Login successful!", username: user.username });
});

// ==============================
// ADMIN LOGIN
// ==============================
app.post("/admin-login", (req, res) => {
  res.json({ success: req.body.password === process.env.ADMIN_PASSWORD });
});

// ==============================
// ADMIN DATA
// ==============================
app.get("/admin-data", async (req, res) => {
  const attacks = await Attack.find().sort({ time: -1 });

  const total = attacks.length;
  const sqlCount = attacks.filter(a => a.type.includes("SQL")).length;
  const bruteCount = attacks.filter(a => a.type.includes("Brute")).length;

  res.json({ total, sqlCount, bruteCount, attacks });
});

// ==============================
// Fake Admin Trap
// ==============================
app.get("/admin", async (req, res) => {
  await logAttack(req, "Admin page accessed", "Admin Scan");
  res.send("Unauthorized Access");
});

// ==============================
// Chat
// ==============================
io.on("connection", (socket) => {
  socket.on("message", (data) => {
    io.emit("message", data);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});