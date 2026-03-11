import { FastifyInstance } from "fastify";
import WebSocket, { RawData } from "ws";

type ConnectedClient = {
  userId: string;
  socket: WebSocket;
};

const clients: Map<string, ConnectedClient> = new Map();

/**
 * WebSocket handler for real-time chat and notifications.
 */
export async function wsHandler(app: FastifyInstance): Promise<void> {
  app.get("/", { websocket: true }, (socket, request) => {
    const token = (request.query as Record<string, string>).token;
    if (!token) {
      socket.close(4001, "Token required");
      return;
    }

    let userId: string;
    try {
      const decoded = app.jwt.verify<{ userId: string }>(token);
      userId = decoded.userId;
    } catch {
      socket.close(4002, "Invalid token");
      return;
    }

    clients.set(userId, { userId, socket });

    socket.on("message", (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        _handleWsMessage(userId, msg);
      } catch {
        // ignore malformed messages
      }
    });

    socket.on("close", () => {
      clients.delete(userId);
    });
  });
}

function _handleWsMessage(senderId: string, msg: { type: string; payload: any }): void {
  switch (msg.type) {
    case "typing": {
      const target = clients.get(msg.payload.recipientId);
      if (target && target.socket.readyState === WebSocket.OPEN) {
        target.socket.send(JSON.stringify({ type: "typing", payload: { senderId } }));
      }
      break;
    }
    case "message_read": {
      const target = clients.get(msg.payload.recipientId);
      if (target && target.socket.readyState === WebSocket.OPEN) {
        target.socket.send(JSON.stringify({
          type: "message_read",
          payload: { conversationId: msg.payload.conversationId, readBy: senderId },
        }));
      }
      break;
    }
  }
}

/**
 * Send a real-time event to a specific user if they're connected via WebSocket.
 */
export function sendToUser(userId: string, event: { type: string; payload: unknown }): void {
  const client = clients.get(userId);
  if (client && client.socket.readyState === WebSocket.OPEN) {
    client.socket.send(JSON.stringify(event));
  }
}
