// ===============================
// IMPORT REQUIRED MODULES
// ===============================
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// ===============================
// CREATE APP & SERVER
// ===============================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json()); // to read JSON data
app.use(express.static(path.join(__dirname, "public"))); // serve frontend

// ===============================
// TEMPORARY USER STORAGE
// (Data will reset if server restarts)
// ===============================
let users = [];

// ===============================
// REGISTER ROUTE
// ===============================
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.json({ success: false, message: "All fields are required!" });
  }

  const existingUser = users.find(user => user.email === email);

  if (existingUser) {
    return res.json({ success: false, message: "User already exists!" });
  }

  users.push({ username, email, password });

  console.log("Registered Users:", users);

  res.json({ success: true, message: "Registration successful!" });
});

// ===============================
// LOGIN ROUTE
// ===============================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    user => user.email === email && user.password === password
  );

  if (!user) {
    return res.json({ success: false, message: "Invalid credentials!" });
  }

  res.json({ success: true, message: "Login successful!" });
});

// ===============================
// SOCKET.IO REAL-TIME CHAT
// ===============================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", (msg) => {
    io.emit("message", msg); // broadcast to all users
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
