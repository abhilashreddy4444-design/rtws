// ===============================
// IMPORT REQUIRED MODULES
// ===============================
const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

// ===============================
// CREATE EXPRESS APP
// ===============================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// CONNECT TO MONGODB
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// ===============================
// CREATE USER SCHEMA
// ===============================
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model("User", userSchema);

// ===============================
// CREATE MESSAGE SCHEMA
// ===============================
const messageSchema = new mongoose.Schema({
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model("Message", messageSchema);

// ===============================
// ROUTES
// ===============================

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Register route
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists!"
      });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.json({
      success: true,
      message: "Registration successful!"
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Registration failed!"
    });
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.json({
        success: false,
        message: "Invalid email or password!"
      });
    }

    res.json({
      success: true,
      message: "Login successful!"
    });

  } catch (error) {
    res.json({
      success: false,
      message: "Login failed!"
    });
  }
});

// ===============================
// SOCKET.IO CHAT
// ===============================
io.on("connection", async (socket) => {
  console.log("User connected");

  // Load old messages
  const messages = await Message.find().sort({ createdAt: 1 });
  socket.emit("loadMessages", messages);

  // Save new message
  socket.on("message", async (msg) => {
    const newMessage = new Message({ text: msg });
    await newMessage.save();

    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
