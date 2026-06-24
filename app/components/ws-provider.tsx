"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { RealtimeWS } from "@/app/lib/ws-client";
import { getChannelHistory } from "@/app/lib/api";
import type { ChatMessage, WSIncomingMessage, ChatMessageFromAPI } from "@/app/lib/types";
import { useAuth } from "./auth-provider";

interface WSContextType {
  isConnected: boolean;
  messages: ChatMessage[];
  groups: string[];
  sendDM: (recipientId: string, text: string) => void;
  sendGroupMessage: (groupId: string, text: string) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  createGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  clearMessages: () => void;
  loadHistory: (channelType: "DM" | "GROUP", channelId: string) => Promise<void>;
}

const WSContext = createContext<WSContextType | null>(null);

export function useWS(): WSContextType {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WSProvider");
  return ctx;
}

function toMessage(msg: WSIncomingMessage | ChatMessageFromAPI): ChatMessage {
  const rawChannelType = (msg as WSIncomingMessage).channel_type || (msg as ChatMessageFromAPI).channel_type;
  // Normalise to uppercase — the API may return "Dm"/"Group" while filters expect "DM"/"GROUP"
  const channelType = rawChannelType?.toUpperCase() as "DM" | "GROUP";
  return {
    id: msg.message_id,
    channelType,
    channelId: (msg as WSIncomingMessage).channel_id || (msg as ChatMessageFromAPI).channel_id,
    senderId: (msg as WSIncomingMessage).sender_id || (msg as ChatMessageFromAPI).sender_id,
    text: (msg as WSIncomingMessage).payload?.text || (msg as ChatMessageFromAPI).text || "",
    timestamp: msg.timestamp,
    conversationId: (msg as WSIncomingMessage).conversation_id || (msg as ChatMessageFromAPI).conversation_id,
    type: (msg as WSIncomingMessage).type || "chat",
  };
}

export function WSProvider({ children }: { children: ReactNode }) {
  const { accessToken, user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groups, setGroups] = useState<string[]>(["general"]);
  const wsRef = useRef<RealtimeWS | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) {
      wsRef.current?.disconnect();
      wsRef.current = null;
      setIsConnected(false);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://yappa.perceptionlabs.tech/ws";

    const ws = new RealtimeWS({
      url: wsUrl,
      token: accessToken,
      reconnect: true,
      tenantId: user.tenant_id,
      userId: user.user_id,
    });

    ws.on("connected", () => {
      setIsConnected(true);
      // Auto-join general on connect
      ws.joinGroup("general");
    });
    ws.on("disconnected", () => setIsConnected(false));
    ws.on("message", (data) => {
      const msg = data as WSIncomingMessage;
      
      // Handle group_created events
      if (msg.type === "group_created" || msg.type === "group_join") {
        const groupId = msg.channel_id;
        setGroups((prev) => {
          if (prev.includes(groupId)) return prev;
          return [...prev, groupId];
        });
      }
      
      setMessages((prev) => {
        // Already have this exact message
        if (prev.some((m) => m.id === msg.message_id)) return prev;

        const incoming = toMessage(msg);

        // Check if this is a server echo of an optimistic local message
        const optimisticIdx = prev.findIndex(
          (m) =>
            m.id.startsWith("local-") &&
            m.senderId === incoming.senderId &&
            m.channelId === incoming.channelId &&
            m.text === incoming.text &&
            Math.abs(m.timestamp - incoming.timestamp) < 10
        );

        if (optimisticIdx !== -1) {
          // Replace optimistic with server-confirmed message
          const next = [...prev];
          next[optimisticIdx] = incoming;
          return next;
        }

        return [...prev, incoming];
      });
    });

    ws.connect();
    // Auto-join general group
    ws.joinGroup("general");
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [isAuthenticated, accessToken, user]);

  useEffect(() => {
    if (wsRef.current && accessToken) {
      wsRef.current.updateToken(accessToken);
    }
  }, [accessToken]);

  const sendDM = useCallback((recipientId: string, text: string) => {
    wsRef.current?.sendDM(recipientId, text);
    // Optimistic local message so the sender sees it immediately
    if (user) {
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        channelType: "DM",
        channelId: recipientId,
        senderId: user.user_id,
        text,
        timestamp: Math.floor(Date.now() / 1000),
        conversationId: "",
        type: "chat",
      };
      setMessages((prev) => [...prev, optimistic]);
    }
  }, [user]);

  const sendGroupMessage = useCallback((groupId: string, text: string) => {
    wsRef.current?.sendGroupMessage(groupId, text);
    // Optimistic local message so the sender sees it immediately
    if (user) {
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        channelType: "GROUP",
        channelId: groupId,
        senderId: user.user_id,
        text,
        timestamp: Math.floor(Date.now() / 1000),
        conversationId: "",
        type: "chat",
      };
      setMessages((prev) => [...prev, optimistic]);
    }
  }, [user]);

  const joinGroup = useCallback((groupId: string) => {
    wsRef.current?.joinGroup(groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    wsRef.current?.leaveGroup(groupId);
  }, []);

  const createGroup = useCallback((groupId: string) => {
    wsRef.current?.createGroup(groupId);
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    wsRef.current?.deleteGroup(groupId);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const loadHistory = useCallback(async (channelType: "DM" | "GROUP", channelId: string) => {
    if (!accessToken || !user) return;
    try {
      const history = await getChannelHistory(user.tenant_id, channelType, channelId, accessToken);
      setMessages((prev) => {
        const merged = [...prev];
        for (const msg of history) {
          if (!merged.some((m) => m.id === msg.message_id)) {
            merged.push(toMessage(msg));
          }
        }
        console.log(merged);
        return merged.sort((a, b) => a.timestamp - b.timestamp);
      });
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, [accessToken, user]);

  return (
    <WSContext.Provider
      value={{
        isConnected,
        messages,
        groups,
        sendDM,
        sendGroupMessage,
        joinGroup,
        leaveGroup,
        createGroup,
        deleteGroup,
        clearMessages,
        loadHistory,
      }}
    >
      {children}
    </WSContext.Provider>
  );
}
