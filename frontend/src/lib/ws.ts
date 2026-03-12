const WS_URL = process.env.NEXT_PUBLIC_WS_URL || getDefaultWsUrl();

type WsListener = (data: { type: string; payload: any }) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners: Set<WsListener> = new Set();

/**
 * Connect to the WebSocket server with the given JWT token.
 */
export function connectWs(token: string): void {
  if (socket?.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(`${WS_URL}?token=${token}`);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((fn) => fn(data));
    } catch {
      // ignore malformed messages
    }
  };

  socket.onclose = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectWs(token), 3000);
  };
}

/**
 * Disconnect from the WebSocket server.
 */
export function disconnectWs(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  socket?.close();
  socket = null;
}

/**
 * Subscribe to WebSocket messages. Returns an unsubscribe function.
 */
export function onWsMessage(listener: WsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Send a message through the WebSocket connection.
 */
export function sendWsMessage(type: string, payload: unknown): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  }
}

function getDefaultWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:4000/ws";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}
