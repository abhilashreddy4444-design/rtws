const socket = io();

function sendMessage() {
  const input = document.getElementById("message");
  const msg = input.value;

  if (msg.trim() !== "") {
    socket.emit("message", msg);
    input.value = "";
  }
}

socket.on("message", (msg) => {
  const chatBox = document.getElementById("chat-box");
  const p = document.createElement("p");
  p.textContent = msg;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});

