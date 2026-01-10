const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ===============================
   FIX FOR "Cannot GET /"
   =============================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   Serve static frontend files
   =============================== */
app.use(express.static("public"));

/* ===============================
   Socket.IO real-time logic
   =============================== */
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (msg) => {
    // Send message to all users
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* ===============================
   PORT for local + Render
   =============================== */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

