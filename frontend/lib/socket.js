import { io } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function connectSocket(token) {
  return io(WS_URL, { auth: { token }, transports: ["websocket"] });
}
