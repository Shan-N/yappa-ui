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
import { getChannelHistory, getGroupsList } from "@/app/lib/api";
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
  const [groups, setGroups] = useState<string[]>(() => {
    // Restore groups from localStorage on initial render
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("yappa_groups");
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          // Always ensure "general" is included
          if (!parsed.includes("general")) parsed.unshift("general");
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return ["general"];
  });
  const wsRef = useRef<RealtimeWS | null>(null);
  const joinedGroupsRef = useRef<Set<string>>(new Set());

  // Persist groups to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && groups.length > 0) {
      localStorage.setItem("yappa_groups", JSON.stringify(groups));
    }
  }, [groups]);

  // Discover groups from message history on login
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    async function discoverGroups() {
      try {
        // Fetch history for all known groups to discover any we might have missed
        const knownGroups = new Set<string>(["general"]);

        // Try to restore from localStorage first
        try {
          const stored = localStorage.getItem("yappa_groups");
          if (stored) {
            const parsed = JSON.parse(stored) as any[];
            parsed.forEach((g) => {
              if (typeof g === "string") knownGroups.add(g);
            });
          }
        } catch {
          // ignore
        }

        // Fetch the definitive list of groups from the backend
        const serverGroups = await getGroupsList(user!.tenant_id, accessToken!);
        serverGroups.forEach((g) => knownGroups.add(g));

        setGroups((prev) => {
          const merged = new Set<string>(prev);
          knownGroups.forEach((g) => merged.add(g));
          // Always keep general first
          const arr = Array.from(merged);
          const generalIdx = arr.indexOf("general");
          if (generalIdx > 0) {
            arr.splice(generalIdx, 1);
            arr.unshift("general");
          }
          return arr;
        });
      } catch {
        // silently fail, we at least have "general"
      }
    }

    discoverGroups();
  }, [isAuthenticated, accessToken, user]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) {
      wsRef.current?.disconnect();
      wsRef.current = null;
      setIsConnected(false);
      joinedGroupsRef.current.clear();
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
      joinedGroupsRef.current.clear();
      // Auto-join all known groups on connect so we receive their messages
      // Read the latest groups from localStorage to ensure we don't miss any
      const groupsToJoin = new Set<string>(["general"]);
      try {
        const stored = localStorage.getItem("yappa_groups");
        if (stored) {
          const parsed = JSON.parse(stored) as any[];
          parsed.forEach((g) => {
            if (typeof g === "string") groupsToJoin.add(g);
          });
        }
      } catch {
        // ignore
      }
      groupsToJoin.forEach((groupId) => {
        ws.joinGroup(groupId);
        joinedGroupsRef.current.add(groupId);
      });
    });
    ws.on("disconnected", () => setIsConnected(false));
    ws.on("message", (data) => {
      const msg = data as WSIncomingMessage;
      
      // Handle group_created / group_join events — add to sidebar for everyone
      if (msg.type === "group_created" || msg.type === "group_join") {
        const groupId = msg.channel_id;
        setGroups((prev) => {
          if (prev.includes(groupId)) return prev;
          return [...prev, groupId];
        });
        
        // Only auto-join if we haven't joined during this connection session
        // to prevent infinite JOIN -> group_join -> JOIN loops
        if (!joinedGroupsRef.current.has(groupId)) {
          ws.joinGroup(groupId);
          joinedGroupsRef.current.add(groupId);
        }
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
    // Optimistically add the group to the list immediately
    setGroups((prev) => {
      if (prev.includes(groupId)) return prev;
      return [...prev, groupId];
    });
    // Also join the group so we receive messages
    wsRef.current?.joinGroup(groupId);
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
      let history: ChatMessageFromAPI[];

      if (channelType === "DM") {
        // DMs are stored with channel_id = recipient, so we need both directions:
        //   1. channel_id = otherUser  →  messages I sent to them
        //   2. channel_id = myUserId   →  messages they sent to me
        const [sent, received] = await Promise.all([
          getChannelHistory(user.tenant_id, "DM", channelId, accessToken),
          getChannelHistory(user.tenant_id, "DM", user.user_id, accessToken),
        ]);
        // Filter received to only messages from this specific conversation partner
        const relevantReceived = received.filter((m) => m.sender_id === channelId);
        history = [...sent, ...relevantReceived];
      } else {
        history = await getChannelHistory(user.tenant_id, channelType, channelId, accessToken);
      }

      setMessages((prev) => {
        const merged = [...prev];
        for (const msg of history) {
          if (!merged.some((m) => m.id === msg.message_id)) {
            merged.push(toMessage(msg));
          }
        }
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
