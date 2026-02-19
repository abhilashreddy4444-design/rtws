const socket = io();

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");

// Send Message
function sendMessage() {
  const msg = messageInput.value.trim();

  if (msg !== "") {
    socket.emit("message", msg);
    addMessage(msg, "sent");
    messageInput.value = "";
  }
}

// Receive Message
socket.on("message", (msg) => {
  addMessage(msg, "received");
});

// Add Message to UI
function addMessage(msg, type) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", type);
  messageDiv.textContent = msg;

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Enter Key Support
messageInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
