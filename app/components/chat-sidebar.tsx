"use client";

import { useState } from "react";
import Avatar from "@/app/components/ui/avatar";
import { cn } from "@/app/lib/utils";
import type { User } from "@/app/lib/types";

interface ChatSidebarProps {
  users: User[];
  groups: string[];
  currentUser: User;
  activeChannel: { type: "dm" | "group"; id: string } | null;
  onSelectDM: (userId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (groupId: string) => void;
  onInvite: () => void;
  tenantName: string;
  userCount: number;
  maxUsers: number;
}

export default function ChatSidebar({
  users,
  groups,
  currentUser,
  activeChannel,
  onSelectDM,
  onSelectGroup,
  onCreateGroup,
  onInvite,
  tenantName,
  userCount,
  maxUsers,
}: ChatSidebarProps) {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupId, setNewGroupId] = useState("");

  const otherUsers = users.filter((u) => u.user_id !== currentUser.user_id);

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (newGroupId.trim()) {
      onCreateGroup(newGroupId.trim());
      setNewGroupId("");
      setShowNewGroup(false);
    }
  }

  return (
    <aside className="w-full md:w-64 lg:w-72 h-full flex flex-col border-r border-border-subtle bg-surface-0 md:bg-surface-50/50">
      {/* Workspace header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-white truncate">
            {tenantName}
          </h2>
          <span className="text-[11px] text-zinc-500 font-medium shrink-0">
            {userCount}/{maxUsers}
          </span>
        </div>
        {currentUser.role === "admin" && (
          <button
            onClick={onInvite}
            className="text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1 mt-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Invite members
          </button>
        )}
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto chat-scroll p-3 space-y-5">
        {/* Groups */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Channels
            </span>
            <button
              onClick={() => setShowNewGroup(!showNewGroup)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="mb-2 px-1">
              <input
                type="text"
                placeholder="channel-name"
                value={newGroupId}
                onChange={(e) =>
                  setNewGroupId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                className="w-full bg-surface-200 border border-border-default rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                autoFocus
              />
            </form>
          )}

          <div className="space-y-0.5">
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => onSelectGroup(group)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-150 flex items-center gap-2",
                  activeChannel?.type === "group" && activeChannel.id === group
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-zinc-500">#</span>
                {group}
              </button>
            ))}
            {groups.length === 0 && (
              <p className="text-xs text-zinc-600 px-3 py-1">No channels yet</p>
            )}
          </div>
        </div>

        {/* Direct Messages */}
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
            Direct Messages
          </span>
          <div className="space-y-0.5">
            {otherUsers.map((user) => (
              <button
                key={user.user_id}
                onClick={() => onSelectDM(user.user_id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2.5",
                  activeChannel?.type === "dm" &&
                    activeChannel.id === user.user_id
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Avatar
                  name={user.display_name}
                  userId={user.user_id}
                  size="sm"
                />
                <span className="truncate">{user.display_name}</span>
              </button>
            ))}
            {otherUsers.length === 0 && (
              <p className="text-xs text-zinc-600 px-3 py-1">
                No other members yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Current user */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-2.5 px-2">
          <Avatar
            name={currentUser.display_name}
            userId={currentUser.user_id}
            size="sm"
            isOnline
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser.display_name}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              @{currentUser.user_id}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
