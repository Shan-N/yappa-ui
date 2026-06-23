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
import type { ChatMessage, WSIncomingMessage } from "@/app/lib/types";
import { useAuth } from "./auth-provider";

interface WSContextType {
  isConnected: boolean;
  messages: ChatMessage[];
  sendDM: (recipientId: string, text: string) => void;
  sendGroupMessage: (groupId: string, text: string) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  createGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  clearMessages: () => void;
}

const WSContext = createContext<WSContextType | null>(null);

export function useWS(): WSContextType {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWS must be used within WSProvider");
  return ctx;
}

function toMessage(msg: WSIncomingMessage): ChatMessage {
  return {
    id: msg.message_id,
    channelType: msg.channel_type,
    channelId: msg.channel_id,
    senderId: msg.sender_id,
    text: msg.payload.text,
    timestamp: msg.timestamp,
    conversationId: msg.conversation_id,
    type: msg.type,
  };
}

export function WSProvider({ children }: { children: ReactNode }) {
  const { accessToken, user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    ws.on("connected", () => setIsConnected(true));
    ws.on("disconnected", () => setIsConnected(false));
    ws.on("message", (data) => {
      const msg = data as WSIncomingMessage;
      setMessages((prev) => [...prev, toMessage(msg)]);
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [isAuthenticated, accessToken, user]);

  // Update token when it refreshes
  useEffect(() => {
    if (wsRef.current && accessToken) {
      wsRef.current.updateToken(accessToken);
    }
  }, [accessToken]);

  const sendDM = useCallback((recipientId: string, text: string) => {
    wsRef.current?.sendDM(recipientId, text);
  }, []);

  const sendGroupMessage = useCallback((groupId: string, text: string) => {
    wsRef.current?.sendGroupMessage(groupId, text);
  }, []);

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

  return (
    <WSContext.Provider
      value={{
        isConnected,
        messages,
        sendDM,
        sendGroupMessage,
        joinGroup,
        leaveGroup,
        createGroup,
        deleteGroup,
        clearMessages,
      }}
    >
      {children}
    </WSContext.Provider>
  );
}
