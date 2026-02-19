const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ===============================
   MongoDB Connection
=============================== */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.log("❌ MongoDB Error:", err));

/* ===============================
   Chat Schema
=============================== */
const MessageSchema = new mongoose.Schema({
  username: String,
  message: String,
  time: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

/* ===============================
   Home Route
=============================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   Socket Logic
=============================== */
io.on("connection", async (socket) => {
  console.log("User connected");

  // Send old messages when user joins
  const messages = await Message.find().sort({ time: 1 });
  socket.emit("loadMessages", messages);

  socket.on("message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();

    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* ===============================
   Start Server
=============================== */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

