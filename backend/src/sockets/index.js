// Real-time layer for in-app chat and live session notifications.
// TODO: flesh out event handlers once the session/chat data model exists.

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { registerSocketHandlers };
