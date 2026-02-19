const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

/* ===============================
   CONNECT TO MONGODB
================================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.log("❌ MongoDB Error:", err));

/* ===============================
   CREATE CHAT SCHEMA
================================= */

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  time: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model("Message", messageSchema);

/* ===============================
   EXPRESS + SOCKET SETUP
================================= */

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ===============================
   FIX FOR "Cannot GET /"
================================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   SOCKET.IO LOGIC
================================= */

io.on("connection", async (socket) => {
  console.log("🟢 User connected");

  // Load old messages from database
  const oldMessages = await Message.find().sort({ time: 1 });
  socket.emit("loadMessages", oldMessages);

  // When new message received
  socket.on("message", async (data) => {

    // Save message to database
    const newMessage = new Message({
      username: data.username,
      message: data.message
    });

    await newMessage.save();

    // Send message to all users
    io.emit("message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });
});

/* ===============================
   PORT FOR LOCAL + RENDER
================================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
