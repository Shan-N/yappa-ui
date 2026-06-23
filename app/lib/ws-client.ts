import type { WSIncomingMessage } from "./types";

export type WSEventType =
  | "connected"
  | "disconnected"
  | "message"
  | "dm"
  | "group_message"
  | "group_join"
  | "group_leave"
  | "error";

type WSEventHandler = (data: WSIncomingMessage | Event | string) => void;

export class RealtimeWS {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnect: boolean;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<WSEventType, Set<WSEventHandler>> = new Map();
  private tenantId: string;
  private userId: string;

  constructor(opts: {
    url: string;
    token: string;
    reconnect?: boolean;
    tenantId: string;
    userId: string;
  }) {
    this.url = opts.url;
    this.token = opts.token;
    this.reconnect = opts.reconnect ?? true;
    this.tenantId = opts.tenantId;
    this.userId = opts.userId;
  }

  on(event: WSEventType, handler: WSEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private emit(event: WSEventType, data: WSIncomingMessage | Event | string) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${this.url}?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected", "connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSIncomingMessage = JSON.parse(event.data);
        this.emit("message", msg);

        switch (msg.type) {
          case "chat":
            if (msg.channel_type === "DM") {
              this.emit("dm", msg);
            } else {
              this.emit("group_message", msg);
            }
            break;
          case "group_join":
            this.emit("group_join", msg);
            break;
          case "group_leave":
            this.emit("group_leave", msg);
            break;
          case "group_message":
            this.emit("group_message", msg);
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = (event) => {
      this.emit("disconnected", `Code: ${event.code}`);
      if (this.reconnect && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.emit("error", event);
    };
  }

  disconnect() {
    this.reconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000);
    this.ws = null;
  }

  updateToken(newToken: string) {
    this.token = newToken;
    // Reconnect with new token
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close(1000);
      this.connect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // ── Send Methods ──

  sendDM(recipientId: string, text: string) {
    this.send({
      channel_type: "DM",
      user_id: recipientId,
      content: text,
    });
  }

  sendGroupMessage(groupId: string, text: string) {
    this.send({
      channel_type: "GROUP",
      user_id: groupId,
      content: text,
    });
  }

  joinGroup(groupId: string) {
    this.send({
      msg_type: "JOIN",
      tenant_id: this.tenantId,
      group_id: groupId,
      user_id: this.userId,
    });
  }

  leaveGroup(groupId: string) {
    this.send({
      msg_type: "LEAVE",
      tenant_id: this.tenantId,
      group_id: groupId,
      user_id: this.userId,
    });
  }

  createGroup(groupId: string) {
    this.send({
      msg_type: "CREATE",
      tenant_id: this.tenantId,
      group_id: groupId,
      user_id: this.userId,
    });
  }

  deleteGroup(groupId: string) {
    this.send({
      msg_type: "DELETE",
      tenant_id: this.tenantId,
      group_id: groupId,
      user_id: this.userId,
    });
  }

  private send(data: Record<string, string>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
