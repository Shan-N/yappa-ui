"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import gsap from "gsap";
import { useAuth } from "@/app/components/auth-provider";
import { useWS } from "@/app/components/ws-provider";
import ChatSidebar from "@/app/components/chat-sidebar";
import ChatMessages from "@/app/components/chat-messages";
import ChatInput from "@/app/components/chat-input";
import InviteModal from "@/app/components/invite-modal";
import { getTenantInfo } from "@/app/lib/api";
import type { TenantInfo, ChatMessage } from "@/app/lib/types";

export default function ChatPage() {
  const { user, accessToken } = useAuth();
  const { messages, groups, sendDM, sendGroupMessage, joinGroup, createGroup, isConnected, loadHistory } =
    useWS();

  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [activeChannel, setActiveChannel] = useState<{
    type: "dm" | "group";
    id: string;
  } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on channel selection (mobile)
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const mainRef = useRef<HTMLDivElement>(null);

  // Fetch tenant info
  useEffect(() => {
    if (user && accessToken) {
      getTenantInfo(user.tenant_id, accessToken)
        .then(setTenantInfo)
        .catch(() => {
          // Set fallback tenant info
          setTenantInfo({
            tenant_id: user.tenant_id,
            name: user.tenant_id,
            created_at: new Date().toISOString(),
            user_count: 1,
            max_users: 10,
            users: [user],
          });
        });
    }
  }, [user, accessToken]);

  // GSAP entrance
  useEffect(() => {
    if (mainRef.current) {
      gsap.fromTo(
        Array.from(mainRef.current.querySelectorAll(".chat-panel")),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "all",
        }
      );
    }
  }, [tenantInfo]);

  // Filter messages for active channel
  const filteredMessages = useMemo((): ChatMessage[] => {
    if (!activeChannel || !user) return [];

    return messages.filter((msg) => {
      if (activeChannel.type === "dm") {
        // Match any DM where both the current user and the other user
        // appear in the senderId/channelId pair (in any direction)
        const ids = [msg.senderId, msg.channelId];
        return (
          msg.channelType === "DM" &&
          ids.includes(user.user_id) &&
          ids.includes(activeChannel.id)
        );
      }
      return (
        (msg.channelType === "GROUP" && msg.channelId === activeChannel.id) ||
        (msg.type === "group_join" && msg.channelId === activeChannel.id) ||
        (msg.type === "group_leave" && msg.channelId === activeChannel.id)
      );
    });
  }, [messages, activeChannel, user]);

  function handleSend(text: string) {
    if (!activeChannel) return;

    if (activeChannel.type === "dm") {
      sendDM(activeChannel.id, text);
    } else {
      sendGroupMessage(activeChannel.id, text);
    }
  }

  function handleCreateGroup(groupId: string) {
    createGroup(groupId);
    joinGroup(groupId);
    setActiveChannel({ type: "group", id: groupId });
  }

  function handleSelectGroup(groupId: string) {
    setActiveChannel({ type: "group", id: groupId });
    loadHistory("GROUP", groupId);
    closeSidebar();
  }

  function handleSelectDM(userId: string) {
    setActiveChannel({ type: "dm", id: userId });
    loadHistory("DM", userId);
    closeSidebar();
  }

  function getChannelDisplayName(): string {
    if (!activeChannel) return "";
    if (activeChannel.type === "group") return activeChannel.id;
    const u = tenantInfo?.users.find((u) => u.user_id === activeChannel.id);
    return u?.display_name || activeChannel.id;
  }

  if (!user || !tenantInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div ref={mainRef} className="flex flex-1 overflow-hidden relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — hidden on mobile unless toggled */}
      <div
        className={`mobile-sidebar absolute top-0 bottom-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-out md:relative md:top-auto md:bottom-auto md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ChatSidebar
          users={tenantInfo.users}
          groups={groups}
          currentUser={user}
          activeChannel={activeChannel}
          onSelectDM={handleSelectDM}
          onSelectGroup={handleSelectGroup}
          onCreateGroup={handleCreateGroup}
          onInvite={() => setShowInvite(true)}
          tenantName={tenantInfo.name}
          userCount={tenantInfo.user_count}
          maxUsers={tenantInfo.max_users}
        />
      </div>

      {/* Main chat area */}
      <div className="chat-panel flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="h-13 flex items-center justify-between px-3 sm:px-5 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                {/* Mobile hamburger / back button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Open sidebar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                {activeChannel.type === "group" ? (
                  <span className="text-zinc-500 text-lg">#</span>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-zinc-500"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                <span className="font-medium text-sm">
                  {getChannelDisplayName()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="flex items-center gap-1.5 text-xs text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                    Reconnecting...
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <ChatMessages
              messages={filteredMessages}
              currentUserId={user.user_id}
              users={tenantInfo.users}
              channelName={getChannelDisplayName()}
              channelType={activeChannel.type}
            />

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              placeholder={
                activeChannel.type === "group"
                  ? `Message #${activeChannel.id}`
                  : `Message ${getChannelDisplayName()}`
              }
              disabled={!isConnected}
            />
          </>
        ) : (
          // No channel selected
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
            {/* Mobile: show sidebar toggle button when no channel selected */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mb-6 p-3 rounded-2xl bg-surface-200 hover:bg-surface-300 transition-colors"
              aria-label="Open sidebar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-surface-200 flex items-center justify-center mb-4 sm:mb-6">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-zinc-500 sm:w-9 sm:h-9"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-semibold mb-2">
              Welcome to {tenantInfo.name}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-sm">
              Select a channel or team member from the sidebar to start
              chatting.
            </p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        tenantId={tenantInfo.tenant_id}
        userCount={tenantInfo.user_count}
        maxUsers={tenantInfo.max_users}
      />
    </div>
  );
}
