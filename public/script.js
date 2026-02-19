const socket = io();

function sendMessage() {
  const input = document.getElementById("message");
  const msg = input.value.trim();

  if (msg !== "") {
    socket.emit("message", msg);
    input.value = "";
  }
}

socket.on("message", (msg) => {
  const chatBox = document.getElementById("chat-box");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", "received");
  messageDiv.textContent = msg;

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});
