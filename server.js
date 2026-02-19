const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==============================
// MongoDB Connection
// ==============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ==============================
// Message Schema
// ==============================
const messageSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// ==============================
// FIX for "Cannot GET /"
// ==============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve static files
app.use(express.static("public"));

// ==============================
// Socket.IO
// ==============================
io.on("connection", async (socket) => {
  console.log("User connected");

  // Send old messages from DB
  const messages = await Message.find().sort({ createdAt: 1 });
  socket.emit("loadMessages", messages);

  // When new message comes
  socket.on("message", async (msg) => {
    const newMessage = new Message({ text: msg });
    await newMessage.save();

    io.emit("message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// ==============================
// PORT
// ==============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
