"use client";

import { useAuth } from "@/app/components/auth-provider";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function DashboardPage() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://yappa.perceptionlabs.tech/ws";
  const apiUrl = typeof window !== "undefined" ? window.location.origin : "";

  const configSnippet = `import { YappaSDK } from "@yappa/sdk";

const sdk = new YappaSDK({
  wsUrl: "${wsUrl}",
  apiUrl: "${apiUrl}",
  tenantId: "${user.tenant_id}",
  userId: "<USER_ID>",
  token: "<JWT_ACCESS_TOKEN>",
});

// Connect and send a message
sdk.connect();
sdk.sendDM("recipient_user_id", "Hello!");`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div ref={cardRef} className="w-full max-w-2xl glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">API Configuration</h1>
            <p className="text-sm text-zinc-400">Use these settings to integrate Yappa into your app</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Tenant ID</label>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-surface-200 rounded-lg px-4 py-2.5 text-sm font-mono">
                {user.tenant_id}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(user.tenant_id)}
                className="p-2.5 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">WebSocket URL</label>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-surface-200 rounded-lg px-4 py-2.5 text-sm font-mono truncate">
                {wsUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(wsUrl)}
                className="p-2.5 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">API URL</label>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-surface-200 rounded-lg px-4 py-2.5 text-sm font-mono truncate">
                {apiUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(apiUrl)}
                className="p-2.5 rounded-lg bg-surface-200 hover:bg-surface-300 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">SDK Quick Start</label>
            <pre className="mt-1.5 bg-surface-200 rounded-lg p-4 text-xs font-mono overflow-x-auto text-zinc-300">
              {configSnippet}
            </pre>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <p className="text-xs text-zinc-500">
              Users authenticate via JWT. Create users via the{" "}
              <code className="text-zinc-400">/api/register</code> endpoint or invite them through the chat interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
