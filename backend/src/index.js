// Student Name: Bryan Wong Tze Hern
// Student ID: TP086538

require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { registerSocketHandlers } = require("./sockets");
const { setIo } = require("./sockets/io");

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || "http://localhost:3000" },
});

setIo(io);
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`MentorBridge API listening on http://localhost:${PORT}`);
});
