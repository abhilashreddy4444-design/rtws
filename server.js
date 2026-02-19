const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let users = [];

/* ================= REGISTER ================= */
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  const userExists = users.find(user => user.email === email);

  if (userExists) {
    return res.json({ success: false, message: "User already exists!" });
  }

  users.push({ username, email, password });

  res.json({ success: true, message: "Registration successful!" });
});

/* ================= LOGIN ================= */
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

/* ================= CHAT SOCKET ================= */
io.on("connection", (socket) => {
  socket.on("message", (msg) => {
    io.emit("message", msg);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
