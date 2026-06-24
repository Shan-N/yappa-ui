"use client";

import { useAuth } from "@/app/components/auth-provider";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  const apiUrl = typeof window !== "undefined" ? window.location.origin : "";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";
  const tenantId = user.tenant_id;

  const endpoints = [
    { name: "Create Tenant", method: "POST", path: "/api/tenants" },
    { name: "Login", method: "POST", path: "/api/login" },
    { name: "Register User", method: "POST", path: "/api/register" },
    { name: "Refresh Token", method: "POST", path: "/api/refresh" },
    { name: "Get Tenant Info", method: "GET", path: "/api/tenants/{tenant_id}" },
    { name: "Get Current User", method: "GET", path: "/api/me" },
    { name: "Message History", method: "GET", path: "/api/history/{tenant_id}/{channel_type}/{channel_id}" },
    { name: "WebSocket", method: "WS", path: "/ws" },
  ];

  const codeExamples = {
    javascript: `import { YappaSDK } from "@yappa/sdk";

const sdk = new YappaSDK({
  wsUrl: "${wsUrl}",
  tenantId: "${tenantId}",
});

// Authenticate first (get token from /api/login)
sdk.setToken("<YOUR_JWT_TOKEN>");

// Connect
sdk.connect();

// Send a direct message
sdk.sendDM("recipient_user_id", "Hello!");

// Send a group message
sdk.sendGroupMessage("general", "Hello group!");

// Listen for messages
sdk.on("message", (msg) => {
  console.log("New message:", msg);
});`,

    curl: `# Login to get access token
curl -X POST ${apiUrl}/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"tenant_id": "${tenantId}", "user_id": "<USER_ID>", "password": "<PASSWORD>"}'

# Get message history
curl ${apiUrl}/api/history/${tenantId}/DM/recipient_user_id \\
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"`,

    typescript: `interface YappaConfig {
  wsUrl: string;        // "${wsUrl}"
  tenantId: string;     // "${tenantId}"
  userId: string;       // Your user's ID
  token: string;        // JWT from /api/login
}`
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div ref={cardRef} className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Project Settings</h1>
            <p className="text-sm text-zinc-400 mt-1">Connect your app to Yappa</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Active
          </div>
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Project URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono truncate">{apiUrl}</code>
              <button
                onClick={() => copyToClipboard(apiUrl, "url")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {copied === "url" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Tenant ID</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono truncate">{tenantId}</code>
              <button
                onClick={() => copyToClipboard(tenantId, "tenant")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {copied === "tenant" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">WebSocket URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono truncate">{wsUrl}</code>
              <button
                onClick={() => copyToClipboard(wsUrl, "ws")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {copied === "ws" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Access Token Section */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Current Access Token</div>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          {showToken && accessToken ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-surface-200 rounded-lg p-3 overflow-x-auto">
                {accessToken}
              </code>
              <button
                onClick={() => copyToClipboard(accessToken!, "token")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {copied === "token" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              {showToken ? "No token available" : "••••••••••••••••"}
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            Tokens expire in 5 minutes. Use the refresh token (HTTP-only cookie) to get a new one via /api/refresh
          </p>
        </div>

        {/* API Endpoints */}
        <div className="glass rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">API Endpoints</div>
          <div className="space-y-2">
            {endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  ep.method === "GET" ? "bg-blue-500/20 text-blue-400" :
                  ep.method === "POST" ? "bg-emerald-500/20 text-emerald-400" :
                  ep.method === "WS" ? "bg-purple-500/20 text-purple-400" :
                  "bg-zinc-500/20 text-zinc-400"
                }`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono">{ep.path}</code>
                <span className="text-xs text-zinc-500 ml-auto">{ep.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="border-b border-border-subtle">
            <div className="flex">
              {(["javascript", "curl", "typescript"] as const).map((lang) => (
                <button
                  key={lang}
                  className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                    copied === `tab-${lang}` 
                      ? "" 
                      : ""
                  }`}
                >
                  {lang === "javascript" ? "JavaScript" : lang === "typescript" ? "TypeScript" : "cURL"}
                </button>
              ))}
            </div>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto bg-surface-200 text-zinc-300">
            {codeExamples.javascript}
          </pre>
        </div>

        {/* Info */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">Quick Start</h3>
          <ol className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-zinc-500">1.</span>
              Create users via <code className="text-zinc-300">/api/register</code> or invite through chat
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">2.</span>
              Users login via <code className="text-zinc-300">/api/login</code> to get JWT tokens
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">3.</span>
              Connect to WebSocket with token: <code className="text-zinc-300">{wsUrl}?token=JWT</code>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">4.</span>
              Send/receive real-time messages
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
