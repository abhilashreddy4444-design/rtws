require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Show Mongo URI (for debugging)
console.log("MONGO_URI:", process.env.MONGO_URI);

// Trust proxy (important for Render)
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// ==============================
// 🔥 Ensure Log File Exists
// ==============================
const logFilePath = path.join(__dirname, "attack_logs.txt");

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "=== Honeypot Attack Logs ===\n\n");
}

// ==============================
// 🔥 Honeypot Logger Function
// ==============================
function logAttack(req, payload, type) {
  const logEntry = `
Time: ${new Date().toLocaleString()}
IP: ${req.ip}
URL: ${req.originalUrl}
Type: ${type}
Payload: ${payload}
----------------------------------------
`;

  console.log("🔥 Attack detected!");
  fs.appendFileSync(logFilePath, logEntry);
}

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
// 🔥 REGISTER ROUTE
// ==============================
app.post("/register", async (req, res) => {

  const suspicious = /('|--|;|<script>|<\/script>|OR|AND|SELECT|DROP|INSERT)/i;

  if (
    suspicious.test(req.body.username) ||
    suspicious.test(req.body.email) ||
    suspicious.test(req.body.password)
  ) {
    logAttack(
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
// 🔥 LOGIN ROUTE
// ==============================
app.post("/login", async (req, res) => {

  const suspicious = /('|--|;|<script>|<\/script>|OR|AND|SELECT|DROP|INSERT)/i;

  if (
    suspicious.test(req.body.email) ||
    suspicious.test(req.body.password)
  ) {
    logAttack(
      req,
      `${req.body.email} ${req.body.password}`,
      "SQLi/XSS Attempt (Login)"
    );

    return res.json({ success: false, message: "Invalid credentials" });
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    logAttack(req, email, "Invalid Email Attempt");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    logAttack(req, `${email} ${password}`, "Brute Force Attempt");
    return res.json({ success: false, message: "Invalid credentials" });
  }

  res.json({
    success: true,
    message: "Login successful!",
    username: user.username
  });
});

// ==============================
// 🔥 Fake Admin Trap
// ==============================
app.get("/admin", (req, res) => {
  logAttack(req, "Admin page accessed", "Admin Scan");
  res.send("Unauthorized Access");
});

// ==============================
// Chat (unchanged)
// ==============================
io.on("connection", (socket) => {
  socket.on("message", (data) => {
    io.emit("message", data);
  });
});

// ==============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});