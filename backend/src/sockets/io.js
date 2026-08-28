// Tiny module-level singleton so services (e.g. notification.service.js) can
// push a socket event without requiring sockets/index.js directly, which
// would create a circular require (sockets/index.js -> service -> sockets/index.js).
let io = null;

function setIo(instance) {
  io = instance;
}

function getIo() {
  return io;
}

module.exports = { setIo, getIo };
