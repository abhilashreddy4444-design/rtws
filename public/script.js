// ===============================
// CONNECT TO SOCKET SERVER
// ===============================
const socket = io();

// ===============================
// ELEMENT REFERENCES
// ===============================
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");

// ===============================
// SEND MESSAGE FUNCTION
// ===============================
function sendMessage() {
  const msg = messageInput.value.trim();

  if (msg !== "") {

    // Send message to server
    socket.emit("message", msg);

    // Display message as "sent"
    addMessage(msg, "sent");

    // Clear input
    messageInput.value = "";
  }
}

// ===============================
// RECEIVE MESSAGE FROM SERVER
// ===============================
socket.on("message", (msg) => {
  addMessage(msg, "received");
});

// ===============================
// ADD MESSAGE TO CHAT BOX
// ===============================
function addMessage(msg, type) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", type);
  messageDiv.textContent = msg;

  chatBox.appendChild(messageDiv);

  // Auto scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===============================
// ENTER KEY SUPPORT
// ===============================
messageInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
