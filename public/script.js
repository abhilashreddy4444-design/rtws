const socket = io();

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");

function sendMessage() {
  const msg = messageInput.value.trim();

  if (msg !== "") {
    socket.emit("message", msg);
    addMessage(msg, "sent");
    messageInput.value = "";
  }
}

socket.on("message", (msg) => {
  addMessage(msg, "received");
});

function addMessage(msg, type) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", type);
  messageDiv.textContent = msg;

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

if (messageInput) {
  messageInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}
