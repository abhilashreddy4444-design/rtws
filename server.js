require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 🔥 Important for Render (real IP capture)
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// ==============================
// MongoDB Connection
// ==============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ==============================
// User Schema
// ==============================
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model("User", userSchema);

// ==============================
// Attack Schema
// ==============================
const attackSchema = new mongoose.Schema({
  ip: String,
  url: String,
  type: String,
  payload: String,
  time: { type: Date, default: Date.now }
});

const Attack = mongoose.model("Attack", attackSchema);

// ==============================
// Honeypot Logger
// ==============================
async function logAttack(req, payload, type) {
  console.log("🔥 Attack detected!");

  const newAttack = new Attack({
    ip: req.ip,
    url: req.originalUrl,
    type: type,
    payload: payload
  });

  await newAttack.save();
}

// ==============================
// REGISTER ROUTE
// ==============================
app.post("/register", async (req, res) => {

  const suspicious = /('|--|;|<script>|<\/script>|OR|AND|SELECT|DROP|INSERT)/i;

  if (
    suspicious.test(req.body.username) ||
    suspicious.test(req.body.email) ||
    suspicious.test(req.body.password)
  ) {
    await logAttack(
      req,
      `${req.body.username} ${req.body.email} ${req.body.password}`,
      "SQLi/XSS Attempt (Register)"
    );

    return res.json({ success: false, message: "Invalid input detected" });
  }

  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.json({ success: false, message: "User already exists!" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword
  });

  await newUser.save();

  res.json({ success: true, message: "Registration successful!" });
});

// ==============================
// LOGIN ROUTE
// ==============================
app.post("/login", async (req, res) => {

  const suspicious = /('|--|;|<script>|<\/script>|OR|AND|SELECT|DROP|INSERT)/i;

  if (
    suspicious.test(req.body.email) ||
    suspicious.test(req.body.password)
  ) {
    await logAttack(
      req,
      `${req.body.email} ${req.body.password}`,
      "SQLi/XSS Attempt (Login)"
    );

    return res.json({ success: false, message: "Invalid credentials" });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    await logAttack(req, email, "Invalid Email Attempt");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    await logAttack(req, `${email} ${password}`, "Brute Force Attempt");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  res.json({
    success: true,
    message: "Login successful!",
    username: user.username
  });
});

// ==============================
// 🔐 ADMIN LOGIN ROUTE
// ==============================
app.post("/admin-login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ==============================
// 🔥 ADMIN DATA ROUTE
// ==============================
app.get("/admin-data", async (req, res) => {
  try {
    const attacks = await Attack.find().sort({ time: -1 });
    res.json(attacks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching data" });
  }
});

// ==============================
// Fake Admin Trap (Scanner Detection)
// ==============================
app.get("/admin", async (req, res) => {
  await logAttack(req, "Admin page accessed", "Admin Scan");
  res.send("Unauthorized Access");
});

// ==============================
// Chat Support
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