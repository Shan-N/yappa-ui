"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Avatar from "@/app/components/ui/avatar";
import { formatMessageTime, cn } from "@/app/lib/utils";
import type { ChatMessage, User } from "@/app/lib/types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
  users: User[];
  channelName: string;
  channelType: "dm" | "group";
}

export default function ChatMessages({
  messages,
  currentUserId,
  users,
  channelName,
  channelType,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  // Auto-scroll and animate new messages
  useEffect(() => {
    if (messages.length > prevLenRef.current && scrollRef.current) {
      // Animate the last message in
      const lastMsg = scrollRef.current.querySelector(".chat-msg:last-child");
      if (lastMsg) {
        gsap.from(lastMsg, {
          y: 10,
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
          clearProps: "all"
        });
      }

      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  function getUserName(userId: string): string {
    const user = users.find((u) => u.user_id === userId);
    return user?.display_name || userId;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8">
        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-surface-200 flex items-center justify-center mb-3 sm:mb-4">
          {channelType === "group" ? (
            <span className="text-2xl text-zinc-500">#</span>
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-zinc-500"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </div>
        <h3 className="text-sm sm:text-base font-semibold mb-1">
          {channelType === "group" ? `#${channelName}` : channelName}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-xs">
          {channelType === "group"
            ? "This is the start of this channel. Send a message to get things going!"
            : "This is the start of your conversation. Say hello!"}
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 chat-scroll p-3 sm:p-5 space-y-3 sm:space-y-4">
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId;
        const isSystem = msg.type === "group_join" || msg.type === "group_leave";

        if (isSystem) {
          return (
            <div key={msg.id} className="chat-msg flex justify-center py-1">
              <span className="text-xs text-zinc-500 bg-surface-200/60 px-3 py-1 rounded-full">
                {msg.text}
              </span>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={cn(
              "chat-msg flex gap-3",
              isMe ? "flex-row-reverse" : "flex-row"
            )}
          >
            {!isMe && (
              <Avatar
                name={getUserName(msg.senderId)}
                userId={msg.senderId}
                size="sm"
              />
            )}
            <div
              className={cn(
                "message-bubble rounded-2xl px-4 py-2.5",
                isMe
                  ? "bg-zinc-800/50 border border-zinc-700 rounded-tr-md"
                  : "bg-surface-200 border border-border-subtle rounded-tl-md"
              )}
            >
              {!isMe && (
                <p className="text-xs font-medium text-zinc-200 mb-0.5">
                  {getUserName(msg.senderId)}
                </p>
              )}
              <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </p>
              <p
                className={cn(
                  "text-[10px] mt-1",
                  isMe ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                {formatMessageTime(msg.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
