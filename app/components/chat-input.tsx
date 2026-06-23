"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-t border-border-subtle"
    >
      <div className="flex items-end gap-3 bg-surface-200 border border-border-default rounded-2xl px-4 py-3 focus-within:border-white/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 resize-none focus:outline-none min-h-[20px] max-h-[120px]"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="shrink-0 h-8 w-8 rounded-lg gradient-brand flex items-center justify-center transition-all duration-200 hover:shadow-lg hover:shadow-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-zinc-600 mt-2 px-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
