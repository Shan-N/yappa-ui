"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./docs.css";

// ---------------------------------------------------------------------------
// Nav data — single source of truth for the sidebar. Section ids below must
// match the `id` prop on each <section> further down the file.
// ---------------------------------------------------------------------------

type NavItem = { id: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "architecture", label: "Architecture" },
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "Core Operations",
    items: [
      { id: "connection", label: "Connection Flow" },
      { id: "messaging", label: "Direct Messages" },
      { id: "groups", label: "Groups" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "options", label: "Options" },
      { id: "auth", label: "Authentication" },
      { id: "reconnection", label: "Reconnection" },
    ],
  },
  {
    title: "SDK Reference",
    items: [
      { id: "client", label: "RealtimeClient" },
      { id: "events", label: "Events" },
      { id: "types", label: "Types" },
      { id: "errors", label: "Error Handling" },
    ],
  },
  {
    title: "Server Contract",
    items: [
      { id: "protocol", label: "Protocol" },
      { id: "limits", label: "Tenant Limits" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function NavLink({
  id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <a
      href={`#${id}`}
      className={`nav-link ${active ? "active" : ""}`}
      onClick={(e) => onClick(e, id)}
    >
      {label}
    </a>
  );
}

// Code samples are stored as small HTML strings (with span classes for
// highlighting) and rendered via dangerouslySetInnerHTML. All content here is
// static and authored by us — never user input — so this is just a simpler,
// less error-prone alternative to hand-nesting dozens of <span> elements in
// JSX (which is what the previous version did, with stray &apos; escapes).
function CodeBlock({ code }: { code: string }) {
  return (
    <pre>
      <code dangerouslySetInnerHTML={{ __html: code }} />
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Code samples
// ---------------------------------------------------------------------------

const INSTALL_CODE = `<span class="comment"># Using npm</span>
npm install @yappa-rs/yappa-sdk

<span class="comment"># Using yarn</span>
yarn add @yappa-rs/yappa-sdk

<span class="comment"># Using pnpm</span>
pnpm add @yappa-rs/yappa-sdk`;

const PEER_DEP_CODE = `npm install ws`;

const QUICKSTART_CODE = `<span class="keyword">import</span> { <span class="function">RealtimeClient</span> } <span class="keyword">from</span> <span class="string">'@yappa-rs/yappa-sdk'</span>;

<span class="comment">// 1. Initialize with your JWT token</span>
<span class="keyword">const</span> client = <span class="keyword">new</span> <span class="function">RealtimeClient</span>({
  <span class="property">url</span>: <span class="string">'wss://your-server.com/ws'</span>,
  <span class="property">token</span>: <span class="string">'eyJhbGciOiJIUzI1NiIs...'</span>,
  <span class="property">authMode</span>: <span class="string">'query'</span> <span class="comment">// Required for browsers</span>
});

<span class="comment">// 2. Listen for messages</span>
client.<span class="function">on</span>(<span class="string">'message'</span>, (msg) => {
  console.<span class="function">log</span>(msg.channel_type + <span class="string">': '</span> + msg.sender_id + <span class="string">' -> '</span> + msg.payload.text);
});

<span class="comment">// 3. Connect</span>
<span class="keyword">await</span> client.<span class="function">connect</span>();

<span class="comment">// 4. Send a direct message</span>
client.<span class="function">sendDM</span>(<span class="string">'bob_123'</span>, <span class="string">'Hello Bob!'</span>);`;

const SEND_DM_CODE = `client.<span class="function">sendDM</span>(<span class="string">'bob_123'</span>, <span class="string">'Hello Bob!'</span>);`;

const DM_RESPONSE_CODE = `{
  <span class="property">"type"</span>: <span class="string">"chat"</span>,
  <span class="property">"message_id"</span>: <span class="string">"550e8400-e29b-41d4-a716-446655440000"</span>,
  <span class="property">"tenant_id"</span>: <span class="string">"tenant_abc"</span>,
  <span class="property">"channel_type"</span>: <span class="string">"DM"</span>,
  <span class="property">"channel_id"</span>: <span class="string">"bob_123"</span>,
  <span class="property">"sender_id"</span>: <span class="string">"alice"</span>,
  <span class="property">"timestamp"</span>: <span class="number">1700000000</span>,
  <span class="property">"conversation_id"</span>: <span class="string">"uuid-derived-from-sha256"</span>,
  <span class="property">"payload"</span>: {
    <span class="property">"text"</span>: <span class="string">"Hello Bob!"</span>,
    <span class="property">"meta"</span>: {}
  }
}`;

const CONVERSATION_ID_CODE = `<span class="comment">// Server pseudocode</span>
participants = [sender_id, recipient_id].sort()
combined = <span class="string">"alice:bob"</span>
hash = SHA256(combined)
conversation_id = UUID.from_bytes(hash[0:16])`;

const CREATE_GROUP_CODE = `client.<span class="function">createGroup</span>(<span class="string">'team-alpha'</span>);`;
const JOIN_GROUP_CODE = `client.<span class="function">joinGroup</span>(<span class="string">'team-alpha'</span>);`;
const SEND_GROUP_CODE = `client.<span class="function">sendGroupMessage</span>(<span class="string">'team-alpha'</span>, <span class="string">'Hi team!'</span>);`;
const LEAVE_DELETE_GROUP_CODE = `client.<span class="function">leaveGroup</span>(<span class="string">'team-alpha'</span>);
client.<span class="function">deleteGroup</span>(<span class="string">'team-alpha'</span>);`;

const HEADER_MODE_CODE = `<span class="keyword">const</span> client = <span class="keyword">new</span> <span class="function">RealtimeClient</span>({
  <span class="property">url</span>: <span class="string">'wss://server.com/ws'</span>,
  <span class="property">token</span>: <span class="string">'eyJ...'</span>,
  <span class="property">authMode</span>: <span class="string">'header'</span> <span class="comment">// Sends: Authorization: Bearer eyJ...</span>
});`;

const QUERY_MODE_CODE = `<span class="keyword">const</span> client = <span class="keyword">new</span> <span class="function">RealtimeClient</span>({
  <span class="property">url</span>: <span class="string">'wss://server.com/ws'</span>,
  <span class="property">token</span>: <span class="string">'eyJ...'</span>,
  <span class="property">authMode</span>: <span class="string">'query'</span> <span class="comment">// Sends: wss://server.com/ws?token=eyJ...</span>
});`;

const TOKEN_REFRESH_CODE = `<span class="keyword">const</span> client = <span class="keyword">new</span> <span class="function">RealtimeClient</span>({
  <span class="property">url</span>: <span class="string">'wss://server.com/ws'</span>,
  <span class="property">token</span>: <span class="string">'eyJ...'</span>,
  <span class="property">refreshUrl</span>: <span class="string">'https://auth.server.com/api/refresh'</span>
});`;

const RECONNECT_EVENTS_CODE = `client.<span class="function">on</span>(<span class="string">'reconnecting'</span>, (attempt) => {
  console.<span class="function">log</span>(<span class="string">'Reconnect attempt '</span> + attempt);
});

client.<span class="function">on</span>(<span class="string">'reconnected'</span>, () => {
  console.<span class="function">log</span>(<span class="string">'Back online!'</span>);
  <span class="comment">// Queued messages are automatically flushed</span>
});`;

const MESSAGE_QUEUE_CODE = `<span class="comment">// These are queued if not connected</span>
client.<span class="function">sendDM</span>(<span class="string">'bob'</span>, <span class="string">'Message 1'</span>);
client.<span class="function">sendDM</span>(<span class="string">'bob'</span>, <span class="string">'Message 2'</span>);

<span class="comment">// On reconnect: both are sent in order</span>`;

const EVENTS_USAGE_CODE = `<span class="keyword">const</span> unsubscribe = client.<span class="function">on</span>(<span class="string">'message'</span>, (msg) => {
  console.<span class="function">log</span>(msg);
});

<span class="comment">// Later: stop listening</span>
unsubscribe();`;

const SERVER_MESSAGE_TYPE_CODE = `<span class="keyword">interface</span> <span class="type">ServerMessage</span> {
  <span class="property">type</span>: <span class="type">string</span>;              <span class="comment">// "chat" or "group_join"</span>
  <span class="property">message_id</span>: <span class="type">string</span>;        <span class="comment">// UUID v4</span>
  <span class="property">tenant_id</span>: <span class="type">string</span>;
  <span class="property">channel_type</span>: <span class="type">ChannelType</span>;
  <span class="property">channel_id</span>: <span class="type">string</span>;         <span class="comment">// recipient user_id or group_id</span>
  <span class="property">sender_id</span>: <span class="type">string</span>;
  <span class="property">timestamp</span>: <span class="type">number</span>;         <span class="comment">// Unix seconds</span>
  <span class="property">conversation_id</span>: <span class="type">string</span>;   <span class="comment">// UUID (DM: derived from participants, Group: group_id)</span>
  <span class="property">payload</span>: {
    <span class="property">text</span>: <span class="type">string</span>;
    <span class="property">meta</span>: <span class="type">Record</span>&lt;<span class="type">string</span>, <span class="type">unknown</span>&gt;;
  };
}`;

const CHANNEL_TYPE_CODE = `<span class="keyword">type</span> <span class="type">ChannelType</span> = <span class="string">"DM"</span> | <span class="string">"GROUP"</span> | <span class="string">"COMMUNITY"</span>;`;

const CONNECTION_STATE_CODE = `<span class="keyword">type</span> <span class="type">ConnectionState</span> =
  | <span class="string">"disconnected"</span>
  | <span class="string">"connecting"</span>
  | <span class="string">"connected"</span>
  | <span class="string">"reconnecting"</span>;`;

const LOG_LEVEL_CODE = `<span class="keyword">type</span> <span class="type">LogLevel</span> = <span class="string">"debug"</span> | <span class="string">"info"</span> | <span class="string">"warn"</span> | <span class="string">"error"</span> | <span class="string">"silent"</span>;`;

const ERROR_CLASSES_CODE = `<span class="keyword">class</span> <span class="type">RealtimeError</span> <span class="keyword">extends</span> <span class="type">Error</span> {
  <span class="property">name</span> = <span class="string">"RealtimeError"</span>;
}

<span class="keyword">class</span> <span class="type">ConnectionError</span> <span class="keyword">extends</span> <span class="type">RealtimeError</span> {
  <span class="property">name</span> = <span class="string">"ConnectionError"</span>;
  <span class="property">cause</span>: <span class="type">unknown</span>;
}`;

const DM_PROTOCOL_CODE = `{
  <span class="property">"channel_type"</span>: <span class="string">"DM"</span>,
  <span class="property">"user_id"</span>: <span class="string">"recipient_user_id"</span>,
  <span class="property">"content"</span>: <span class="string">"Hello!"</span>
}`;

const GROUP_PROTOCOL_CODE = `{
  <span class="property">"channel_type"</span>: <span class="string">"GROUP"</span>,
  <span class="property">"user_id"</span>: <span class="string">"group_id"</span>,
  <span class="property">"content"</span>: <span class="string">"Hello team!"</span>
}`;

const GROUP_OPS_CODE = `<span class="comment">// Join</span>
{<span class="property">"msg_type"</span>:<span class="string">"JOIN"</span>,<span class="property">"tenant_id"</span>:<span class="string">"t1"</span>,<span class="property">"group_id"</span>:<span class="string">"g1"</span>,<span class="property">"user_id"</span>:<span class="string">"alice"</span>}

<span class="comment">// Leave</span>
{<span class="property">"msg_type"</span>:<span class="string">"LEAVE"</span>,<span class="property">"tenant_id"</span>:<span class="string">"t1"</span>,<span class="property">"group_id"</span>:<span class="string">"g1"</span>,<span class="property">"user_id"</span>:<span class="string">"alice"</span>}

<span class="comment">// Create</span>
{<span class="property">"msg_type"</span>:<span class="string">"CREATE"</span>,<span class="property">"tenant_id"</span>:<span class="string">"t1"</span>,<span class="property">"group_id"</span>:<span class="string">"new_group"</span>,<span class="property">"user_id"</span>:<span class="string">"alice"</span>}

<span class="comment">// Delete</span>
{<span class="property">"msg_type"</span>:<span class="string">"DELETE"</span>,<span class="property">"tenant_id"</span>:<span class="string">"t1"</span>,<span class="property">"group_id"</span>:<span class="string">"g1"</span>,<span class="property">"user_id"</span>:<span class="string">"alice"</span>}`;

const ARCHITECTURE_DIAGRAM = `                    ┌─────────────────────┐
                    │    Load Balancer    │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ┌───────────┐         ┌───────────┐         ┌───────────┐
   │  WS Node  │         │  WS Node  │         │  WS Node  │
   │ (Rust/    │         │ (Rust/    │         │ (Rust/    │
   │  Axum)    │         │  Axum)    │         │  Axum)    │
   └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    ▼                          ▼                          ▼
┌────────┐              ┌────────────┐              ┌────────────┐
│ Redis  │              │   Kafka    │              │ PostgreSQL │
│Pub/Sub │              │ (optional) │              │            │
└────────┘              └────────────┘              └────────────┘`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>("introduction");

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Sidebar entrance
      tl.from(".sidebar", {
        x: -50,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
      });

      // Nav items stagger
      tl.from(
        ".nav-link, .nav-section-title, .logo",
        {
          x: -20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: "power3.out",
        },
        "-=0.6"
      );

      // Main header entrance
      tl.from(
        ".hero-header > *",
        {
          y: 40,
          opacity: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power4.out",
        },
        "-=1.2"
      );

      // Scroll-triggered reveal for each section. We set the hidden starting
      // state explicitly here (rather than in CSS) so the page still renders
      // fully visible if JS never runs, instead of being permanently blank.
      const sections = gsap.utils.toArray<HTMLElement>(".section");
      gsap.set(sections, { opacity: 0, y: 30 });

      sections.forEach((section) => {
        gsap.to(section, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, containerRef);

    // Intersection Observer to update active nav link on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: "-20% 0px -80% 0px",
        threshold: 0,
      }
    );

    const sectionElements = document.querySelectorAll(".section");
    sectionElements.forEach((section) => observer.observe(section));

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      window.scrollTo({
        top: targetSection.offsetTop - 80,
        behavior: "smooth",
      });
      setActiveSection(targetId);
    }
  };

  return (
    <div ref={containerRef} className="docs-page">
      <div className="docs-container">
        <nav className="sidebar">
          <div className="sidebar-header">
            <Link href="/" className="logo">
              <div className="logo-icon">Y</div>
              Yappa
            </Link>
          </div>
          <div className="sidebar-nav">
            {NAV_GROUPS.map((group) => (
              <div className="nav-section" key={group.title}>
                <div className="nav-section-title">{group.title}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    active={activeSection === item.id}
                    onClick={handleNavClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>

        <main className="main">
          <div className="hero-header">
            <h1 className="page-title">SDK Documentation</h1>
            <p className="page-subtitle">
              TypeScript/JavaScript SDK for Yappa RT — a production-grade, multi-tenant WebSocket messaging engine.
            </p>
          </div>

          <section id="introduction" className="section">
            <h2 className="section-title">Introduction</h2>
            <p>
              Yappa SDK is the official client for <strong>Yappa RT</strong>, a horizontally scalable WebSocket
              server built with Rust (Axum/Tokio). It provides real-time messaging with complete tenant isolation,
              JWT authentication, and cross-node message delivery via Redis pub/sub.
            </p>

            <div className="card-grid">
              <div className="card">
                <div className="card-title">Multi-Tenant</div>
                <div className="card-desc">Complete isolation with configurable user limits per tenant.</div>
              </div>
              <div className="card">
                <div className="card-title">Horizontally Scalable</div>
                <div className="card-desc">Stateless servers with Redis pub/sub for cross-node routing.</div>
              </div>
              <div className="card">
                <div className="card-title">JWT Auth</div>
                <div className="card-desc">HS256 tokens strictly binding tenant_id and user_id claims.</div>
              </div>
              <div className="card">
                <div className="card-title">Durable Storage</div>
                <div className="card-desc">Kafka-backed persistence, or direct PostgreSQL in demo mode.</div>
              </div>
            </div>

            <h3>Key Features</h3>
            <ul className="feature-list">
              <li>Auto-reconnect with exponential backoff</li>
              <li>Message deduplication via message_id</li>
              <li>Heartbeat monitoring for dead connection detection</li>
              <li>Send queue buffers messages while offline</li>
              <li>Multi-device support (same user, multiple connections)</li>
            </ul>
          </section>

          <section id="architecture" className="section">
            <h2 className="section-title">System Architecture</h2>
            <p>Messages flow through multiple layers to ensure delivery across nodes:</p>
            <div className="architecture-diagram">{ARCHITECTURE_DIAGRAM}</div>

            <h3>Components</h3>
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Tech</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>yappa-rt</strong></td>
                  <td>Rust (Axum/Tokio)</td>
                  <td>WebSocket server, message routing, tenant limits</td>
                </tr>
                <tr>
                  <td><strong>yappa-auth</strong></td>
                  <td>Node.js (Express)</td>
                  <td>User authentication, JWT issuance</td>
                </tr>
                <tr>
                  <td><strong>yappa-sdk</strong></td>
                  <td>TypeScript</td>
                  <td>Browser/Node.js client SDK</td>
                </tr>
                <tr>
                  <td><strong>Redis</strong></td>
                  <td>Redis 7</td>
                  <td>Pub/sub for cross-node messaging, tenant limits</td>
                </tr>
                <tr>
                  <td><strong>Kafka</strong></td>
                  <td>Kafka 3.7</td>
                  <td>Durable message streaming (optional)</td>
                </tr>
                <tr>
                  <td><strong>PostgreSQL</strong></td>
                  <td>Postgres 16</td>
                  <td>User storage, message persistence</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="installation" className="section">
            <h2 className="section-title">Installation</h2>
            <p>Install the SDK via your preferred package manager:</p>
            <CodeBlock code={INSTALL_CODE} />

            <h3>Peer Dependencies (Node.js only)</h3>
            <CodeBlock code={PEER_DEP_CODE} />

            <div className="info-box">
              <strong>Browser:</strong> The SDK uses the native <code>WebSocket</code> API. No polyfills needed.
            </div>
          </section>

          <section id="quickstart" className="section">
            <h2 className="section-title">Quick Start</h2>
            <CodeBlock code={QUICKSTART_CODE} />
          </section>

          <section id="connection" className="section">
            <h2 className="section-title">Connection Flow</h2>
            <p>
              When you call <code>client.connect()</code>, the following sequence occurs:
            </p>

            <div className="flow-box">
              <div className="flow-step">
                <div className="flow-number">1</div>
                <div className="flow-content">
                  <div className="flow-title">SDK: WebSocket Upgrade Request</div>
                  <div className="flow-desc">
                    Opens WebSocket to <code>/ws</code> endpoint with JWT in the Authorization header or query
                    string.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">2</div>
                <div className="flow-content">
                  <div className="flow-title">Server: JWT Validation</div>
                  <div className="flow-desc">
                    Validates the HS256 signature, extracts <code>tenant_id</code> and <code>user_id</code> from
                    claims.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">3</div>
                <div className="flow-content">
                  <div className="flow-title">Server: Tenant Limit Check</div>
                  <div className="flow-desc">
                    Atomically checks if the tenant is under <code>MAX_USERS_PER_TENANT</code> via a Redis Lua
                    script.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">4</div>
                <div className="flow-content">
                  <div className="flow-title">Server: Connection Registration</div>
                  <div className="flow-desc">
                    Stores the connection in <code>ConnectionRegistry</code>, keyed by{" "}
                    <code>(tenant_id, user_id, connection_id)</code>.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">5</div>
                <div className="flow-content">
                  <div className="flow-title">SDK: 'connected' Event Fired</div>
                  <div className="flow-desc">
                    SDK emits the <code>connected</code> event and drains any queued messages.
                  </div>
                </div>
              </div>
            </div>

            <h3>Connection Identity</h3>
            <p>
              Every WebSocket connection is uniquely identified by the tuple <code>(tenant_id, user_id)</code>:
            </p>
            <ul className="feature-list">
              <li>Identity is extracted from the JWT and is immutable for the socket&rsquo;s lifetime</li>
              <li>One user can have multiple concurrent connections (multi-device)</li>
              <li>Each connection gets a unique <code>connection_id</code> (UUID v4)</li>
            </ul>

            <h3>Connection States</h3>
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>disconnected</code></td>
                  <td>No active connection</td>
                </tr>
                <tr>
                  <td><code>connecting</code></td>
                  <td>WebSocket upgrade in progress, awaiting auth</td>
                </tr>
                <tr>
                  <td><code>connected</code></td>
                  <td>Connection active, ready to send/receive</td>
                </tr>
                <tr>
                  <td><code>reconnecting</code></td>
                  <td>Connection lost, SDK attempting reconnect</td>
                </tr>
              </tbody>
            </table>

            <div className="warning-box">
              <strong>Auth Failure:</strong> If the JWT is invalid or the tenant limit is reached, the server
              returns HTTP 401 (unauthorized) or HTTP 429 (too many requests). The SDK emits an{" "}
              <code>error</code> event.
            </div>
          </section>

          <section id="messaging" className="section">
            <h2 className="section-title">Direct Messages</h2>
            <p>Send a 1-to-1 message using the <code>sendDM</code> method:</p>
            <CodeBlock code={SEND_DM_CODE} />

            <h3>What Happens on the Server</h3>
            <div className="flow-box">
              <div className="flow-step">
                <div className="flow-number">1</div>
                <div className="flow-content">
                  <div className="flow-title">SDK → Server</div>
                  <div className="flow-desc">
                    Sends JSON: <code>{'{"channel_type":"DM","user_id":"bob_123","content":"Hello Bob!"}'}</code>
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">2</div>
                <div className="flow-content">
                  <div className="flow-title">Server: Message Creation</div>
                  <div className="flow-desc">
                    Generates <code>message_id</code> (UUID), <code>conversation_id</code> (SHA-256 hash of sorted
                    user IDs), and a timestamp.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">3</div>
                <div className="flow-content">
                  <div className="flow-title">Server: Redis Publish</div>
                  <div className="flow-desc">
                    Publishes to the <code>{'user:{tenant_id}:{recipient_user_id}'}</code> channel.
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">4</div>
                <div className="flow-content">
                  <div className="flow-title">All Nodes: Receive</div>
                  <div className="flow-desc">Every WS node subscribed to Redis receives the message.</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">5</div>
                <div className="flow-content">
                  <div className="flow-title">Recipient&rsquo;s Node: Deliver</div>
                  <div className="flow-desc">The node holding the recipient&rsquo;s connection(s) sends via WebSocket.</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">6</div>
                <div className="flow-content">
                  <div className="flow-title">Server: Persist</div>
                  <div className="flow-desc">Message is stored to Kafka (production) or PostgreSQL (demo mode).</div>
                </div>
              </div>
            </div>

            <h3>Server Response Format</h3>
            <CodeBlock code={DM_RESPONSE_CODE} />

            <h3>Conversation ID Generation</h3>
            <p>The <code>conversation_id</code> is deterministically generated from participant IDs:</p>
            <CodeBlock code={CONVERSATION_ID_CODE} />

            <div className="info-box">
              <strong>Message Size:</strong> Maximum payload is 64KB. Messages exceeding this are rejected with an
              error sent back to the sender.
            </div>
          </section>

          <section id="groups" className="section">
            <h2 className="section-title">Groups</h2>
            <p>
              Group operations allow creating, joining, leaving, and sending messages to channels. Groups are
              scoped to a tenant and persisted to PostgreSQL for durability.
            </p>

            <h3>createGroup(groupId)</h3>
            <p>Creates a new group and automatically joins the creator.</p>
            <CodeBlock code={CREATE_GROUP_CODE} />

            <h3>joinGroup(groupId)</h3>
            <p>Subscribes the current user to a group&rsquo;s message stream. The group must already exist.</p>
            <CodeBlock code={JOIN_GROUP_CODE} />

            <h3>sendGroupMessage(groupId, content)</h3>
            <CodeBlock code={SEND_GROUP_CODE} />
            <div className="error-box">
              <strong>Must Join First:</strong> Sending to a group without joining returns an error message:{" "}
              <code>&quot;You must join the group before sending messages&quot;</code>
            </div>

            <h3>leaveGroup(groupId) / deleteGroup(groupId)</h3>
            <CodeBlock code={LEAVE_DELETE_GROUP_CODE} />
            <ul className="feature-list">
              <li>
                <code>leaveGroup</code> — removes you from the in-memory member set; no database change.
              </li>
              <li>
                <code>deleteGroup</code> — removes the group from the in-memory registry; database records persist
                for history.
              </li>
            </ul>

            <div className="info-box">
              <strong>Note:</strong> Group membership is persisted to PostgreSQL. The <code>group_members</code>{" "}
              table has a foreign key to <code>groups(conversation_id)</code>, so when a user joins, the server
              first looks up the group by tenant_id + name to resolve the conversation_id before inserting the
              membership row.
            </div>
          </section>

          <section id="options" className="section">
            <h2 className="section-title">Configuration Options</h2>
            <p>
              Pass these options when initializing <code>RealtimeClient</code>:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>url</code> <span className="badge badge-red">required</span></td>
                  <td><code>string</code></td>
                  <td>—</td>
                  <td>WebSocket endpoint (<code>ws://</code> or <code>wss://</code>)</td>
                </tr>
                <tr>
                  <td><code>token</code> <span className="badge badge-red">required</span></td>
                  <td><code>string</code></td>
                  <td>—</td>
                  <td>HS256 JWT with <code>tenant_id</code> and <code>user_id</code> claims</td>
                </tr>
                <tr>
                  <td><code>authMode</code></td>
                  <td><code>'header' | 'query'</code></td>
                  <td><code>'header'</code></td>
                  <td>Use <code>'query'</code> for browsers (no custom header support)</td>
                </tr>
                <tr>
                  <td><code>heartbeatTimeout</code></td>
                  <td><code>number</code></td>
                  <td><code>35000</code></td>
                  <td>Ms without activity before assuming the connection is dead</td>
                </tr>
                <tr>
                  <td><code>reconnect</code></td>
                  <td><code>boolean</code></td>
                  <td><code>true</code></td>
                  <td>Auto-reconnect on disconnect</td>
                </tr>
                <tr>
                  <td><code>maxReconnectAttempts</code></td>
                  <td><code>number</code></td>
                  <td><code>Infinity</code></td>
                  <td>Max reconnection tries before <code>reconnect_failed</code></td>
                </tr>
                <tr>
                  <td><code>reconnectBaseDelay</code></td>
                  <td><code>number</code></td>
                  <td><code>1000</code></td>
                  <td>Initial delay (ms), doubles each attempt</td>
                </tr>
                <tr>
                  <td><code>reconnectMaxDelay</code></td>
                  <td><code>number</code></td>
                  <td><code>30000</code></td>
                  <td>Maximum reconnection delay cap</td>
                </tr>
                <tr>
                  <td><code>dedup</code></td>
                  <td><code>boolean</code></td>
                  <td><code>true</code></td>
                  <td>Deduplicate messages by <code>message_id</code></td>
                </tr>
                <tr>
                  <td><code>dedupTTL</code></td>
                  <td><code>number</code></td>
                  <td><code>60000</code></td>
                  <td>How long to remember seen message IDs (ms)</td>
                </tr>
                <tr>
                  <td><code>maxQueueSize</code></td>
                  <td><code>number</code></td>
                  <td><code>1000</code></td>
                  <td>Max messages buffered while offline</td>
                </tr>
                <tr>
                  <td><code>logLevel</code></td>
                  <td><code>'debug' | 'info' | 'warn' | 'error' | 'silent'</code></td>
                  <td><code>'warn'</code></td>
                  <td>Console logging verbosity</td>
                </tr>
                <tr>
                  <td><code>refreshUrl</code></td>
                  <td><code>string</code></td>
                  <td>—</td>
                  <td>URL to POST for automatic token refresh</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="auth" className="section">
            <h2 className="section-title">Authentication</h2>

            <h3>JWT Requirements</h3>
            <p>Your JWT must be signed with HS256 and contain the following claims:</p>
            <table>
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>tenant_id</code></td>
                  <td><span className="badge badge-red">required</span></td>
                  <td>Organization/tenant identifier</td>
                </tr>
                <tr>
                  <td><code>user_id</code></td>
                  <td><span className="badge badge-red">required</span></td>
                  <td>User identifier within the tenant</td>
                </tr>
                <tr>
                  <td><code>exp</code></td>
                  <td><span className="badge badge-red">required</span></td>
                  <td>Expiration timestamp</td>
                </tr>
                <tr>
                  <td><code>iss</code></td>
                  <td><span className="badge badge-orange">optional</span></td>
                  <td>Issuer (validated if present)</td>
                </tr>
                <tr>
                  <td><code>aud</code></td>
                  <td><span className="badge badge-orange">optional</span></td>
                  <td>Audience (validated if present)</td>
                </tr>
              </tbody>
            </table>

            <h3>Auth Modes</h3>

            <h4>
              Header Mode <span className="badge badge-blue">Default</span>
            </h4>
            <CodeBlock code={HEADER_MODE_CODE} />

            <h4>
              Query Mode <span className="badge badge-green">Recommended for Browsers</span>
            </h4>
            <CodeBlock code={QUERY_MODE_CODE} />

            <h3>Token Refresh</h3>
            <p>Configure automatic token refresh — the SDK refreshes every 4 minutes:</p>
            <CodeBlock code={TOKEN_REFRESH_CODE} />
            <p>
              The SDK POSTs to <code>refreshUrl</code> with credentials (cookies), expecting{" "}
              <code>{'{"access_token": "..."}'}</code> in the response.
            </p>
          </section>

          <section id="reconnection" className="section">
            <h2 className="section-title">Reconnection Strategy</h2>
            <p>
              The SDK automatically reconnects with exponential backoff when the connection drops, with jitter to
              prevent thundering herds. The maximum backoff is capped at 30 seconds.
            </p>

            <h3>Server-Side: Connection Cleanup</h3>
            <p>
              When a connection drops, the server&rsquo;s <code>ConnectionGuard</code> (Drop trait) ensures:
            </p>
            <ul className="feature-list">
              <li>Connection is removed from <code>ConnectionRegistry</code></li>
              <li>The user&rsquo;s slot is released via <code>TenantLimiter.release()</code></li>
              <li>Group memberships are preserved and reattached on reconnect</li>
            </ul>

            <h3>SDK-Side: Reconnection Flow</h3>
            <CodeBlock code={RECONNECT_EVENTS_CODE} />

            <div className="flow-box">
              <div className="flow-step">
                <div className="flow-number">1</div>
                <div className="flow-content">
                  <div className="flow-title">Connection Lost</div>
                  <div className="flow-desc">WebSocket closes, or heartbeat timeout (35s of no activity)</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">2</div>
                <div className="flow-content">
                  <div className="flow-title">SDK: State → &lsquo;reconnecting&rsquo;</div>
                  <div className="flow-desc">Emits a <code>reconnecting</code> event with the attempt number</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">3</div>
                <div className="flow-content">
                  <div className="flow-title">Wait (Exponential Backoff)</div>
                  <div className="flow-desc">
                    <code>min(baseDelay * 2^(attempt-1), maxDelay)</code> — default: 1s → 2s → 4s → … → 30s
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">4</div>
                <div className="flow-content">
                  <div className="flow-title">Attempt Reconnect</div>
                  <div className="flow-desc">New WebSocket upgrade with the same token</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">5</div>
                <div className="flow-content">
                  <div className="flow-title">On Success</div>
                  <div className="flow-desc">
                    State → &lsquo;connected&rsquo;, emits <code>reconnected</code>, drains the queue, rejoins groups
                  </div>
                </div>
              </div>
            </div>

            <h3>Message Queue</h3>
            <p>
              Messages sent while offline are queued (up to <code>maxQueueSize</code>) and flushed on reconnect:
            </p>
            <CodeBlock code={MESSAGE_QUEUE_CODE} />
          </section>

          <section id="client" className="section">
            <h2 className="section-title">RealtimeClient</h2>
            <p>
              The primary class for interacting with the Yappa realtime server. It extends standard
              EventTarget/EventEmitter paradigms.
            </p>

            <h3>Methods</h3>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Parameters</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>connect()</code></td>
                  <td>—</td>
                  <td>Establishes the WebSocket connection. Returns a Promise.</td>
                </tr>
                <tr>
                  <td><code>disconnect()</code></td>
                  <td>—</td>
                  <td>Gracefully closes the connection and cleans up listeners.</td>
                </tr>
                <tr>
                  <td><code>sendDM(userId, content)</code></td>
                  <td><code>userId: string, content: string</code></td>
                  <td>Sends a direct message (1–64,000 chars).</td>
                </tr>
                <tr>
                  <td><code>sendGroupMessage(groupId, content)</code></td>
                  <td><code>groupId: string, content: string</code></td>
                  <td>Sends a group message (must join first).</td>
                </tr>
                <tr>
                  <td><code>joinGroup(groupId)</code></td>
                  <td><code>groupId: string</code></td>
                  <td>Joins a group to receive its messages.</td>
                </tr>
                <tr>
                  <td><code>leaveGroup(groupId)</code></td>
                  <td><code>groupId: string</code></td>
                  <td>Leaves a group.</td>
                </tr>
                <tr>
                  <td><code>createGroup(groupId)</code></td>
                  <td><code>groupId: string</code></td>
                  <td>Creates and auto-joins a new group.</td>
                </tr>
                <tr>
                  <td><code>deleteGroup(groupId)</code></td>
                  <td><code>groupId: string</code></td>
                  <td>Deletes a group.</td>
                </tr>
                <tr>
                  <td><code>updateToken(token)</code></td>
                  <td><code>token: string</code></td>
                  <td>Updates the authentication token on an existing client.</td>
                </tr>
                <tr>
                  <td><code>on(event, handler)</code></td>
                  <td><code>event: string, handler: Function</code></td>
                  <td>Subscribes to an event. Returns an unsubscribe function.</td>
                </tr>
              </tbody>
            </table>

            <h3>Properties</h3>
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>state</code></td>
                  <td><code>ConnectionState</code></td>
                  <td>Current connection state (read-only)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="events" className="section">
            <h2 className="section-title">Events</h2>
            <p>
              Listen to lifecycle and message events using <code>client.on(event, handler)</code>.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Payload</th>
                  <th>When Fired</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>connected</code></td>
                  <td><code>void</code></td>
                  <td>WebSocket connection established and registered</td>
                </tr>
                <tr>
                  <td><code>disconnected</code></td>
                  <td><code>reason: string</code></td>
                  <td>Connection closed (e.g. &quot;manual&quot;, &quot;transport closed&quot;)</td>
                </tr>
                <tr>
                  <td><code>reconnecting</code></td>
                  <td><code>attempt: number</code></td>
                  <td>Starting a reconnection attempt</td>
                </tr>
                <tr>
                  <td><code>reconnected</code></td>
                  <td><code>void</code></td>
                  <td>Successfully reconnected</td>
                </tr>
                <tr>
                  <td><code>reconnect_failed</code></td>
                  <td><code>void</code></td>
                  <td>Max reconnect attempts exhausted</td>
                </tr>
                <tr>
                  <td><code>message</code></td>
                  <td><code>ServerMessage</code></td>
                  <td>Any incoming chat message or group lifecycle event</td>
                </tr>
                <tr>
                  <td><code>dm</code></td>
                  <td><code>ServerMessage</code></td>
                  <td>Direct message (<code>channel_type: &quot;DM&quot;</code>)</td>
                </tr>
                <tr>
                  <td><code>group_message</code></td>
                  <td><code>ServerMessage</code></td>
                  <td>Group message (<code>channel_type: &quot;GROUP&quot;</code>)</td>
                </tr>
                <tr>
                  <td><code>group_join</code></td>
                  <td><code>ServerMessage</code></td>
                  <td>User joined a group (<code>type: &quot;group_join&quot;</code>)</td>
                </tr>
                <tr>
                  <td><code>error</code></td>
                  <td><code>RealtimeError</code></td>
                  <td>Socket, auth, or connection error</td>
                </tr>
              </tbody>
            </table>

            <h3>Usage</h3>
            <CodeBlock code={EVENTS_USAGE_CODE} />
          </section>

          <section id="types" className="section">
            <h2 className="section-title">Type Definitions</h2>

            <h3>ServerMessage</h3>
            <CodeBlock code={SERVER_MESSAGE_TYPE_CODE} />

            <h3>ChannelType</h3>
            <CodeBlock code={CHANNEL_TYPE_CODE} />

            <h3>ConnectionState</h3>
            <CodeBlock code={CONNECTION_STATE_CODE} />

            <h3>LogLevel</h3>
            <CodeBlock code={LOG_LEVEL_CODE} />
          </section>

          <section id="errors" className="section">
            <h2 className="section-title">Error Handling</h2>

            <h3>Error Classes</h3>
            <CodeBlock code={ERROR_CLASSES_CODE} />

            <h3>Common Errors</h3>
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Error</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Invalid JWT</td>
                  <td>HTTP 401</td>
                  <td>Get a new token from the auth service</td>
                </tr>
                <tr>
                  <td>Tenant at capacity</td>
                  <td>HTTP 429</td>
                  <td>Wait for other users to disconnect</td>
                </tr>
                <tr>
                  <td>Message too large</td>
                  <td><code>&quot;Payload too large&quot;</code></td>
                  <td>Split the message or reduce its size</td>
                </tr>
                <tr>
                  <td>Not in group</td>
                  <td><code>&quot;You must join the group...&quot;</code></td>
                  <td>Call <code>joinGroup()</code> first</td>
                </tr>
                <tr>
                  <td>Token refresh failed</td>
                  <td><code>RealtimeError</code></td>
                  <td>Re-authenticate with yappa-auth</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="protocol" className="section">
            <h2 className="section-title">WebSocket Protocol</h2>

            <h3>Client → Server Messages</h3>

            <h4>Direct Message</h4>
            <CodeBlock code={DM_PROTOCOL_CODE} />

            <h4>Group Message</h4>
            <CodeBlock code={GROUP_PROTOCOL_CODE} />

            <h4>Group Operations</h4>
            <CodeBlock code={GROUP_OPS_CODE} />

            <h3>Server Heartbeat</h3>
            <p>
              The server sends <code>Ping</code> frames every 15 seconds. The client should respond with{" "}
              <code>Pong</code>. If there&rsquo;s no activity for 30 seconds, the server closes the connection.
            </p>
          </section>

          <section id="limits" className="section">
            <h2 className="section-title">Tenant Limits</h2>
            <p>
              The server enforces <code>MAX_USERS_PER_TENANT</code> (default: 10) using atomic Redis Lua scripts:
            </p>

            <div className="flow-box">
              <div className="flow-step">
                <div className="flow-number">1</div>
                <div className="flow-content">
                  <div className="flow-title">Connection Attempt</div>
                  <div className="flow-desc">
                    User connects with a JWT containing <code>tenant_id</code> and <code>user_id</code>
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">2</div>
                <div className="flow-content">
                  <div className="flow-title">Atomic Check</div>
                  <div className="flow-desc">
                    Lua script checks <code>{'SCARD online:{tenant_id}'}</code> against the limit
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">3</div>
                <div className="flow-content">
                  <div className="flow-title">Existing User?</div>
                  <div className="flow-desc">If the user is already online: allow (multi-device). Otherwise: check the limit.</div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">4</div>
                <div className="flow-content">
                  <div className="flow-title">Under Limit: Allow</div>
                  <div className="flow-desc">
                    <code>{'SADD online:{tenant_id} user_id'}</code> and{" "}
                    <code>{'INCR conncount:{tenant_id}:{user_id}'}</code>
                  </div>
                </div>
              </div>
              <div className="flow-step">
                <div className="flow-number">5</div>
                <div className="flow-content">
                  <div className="flow-title">At Limit: Reject</div>
                  <div className="flow-desc">Returns HTTP 429 Too Many Requests</div>
                </div>
              </div>
            </div>

            <div className="info-box">
              <strong>Multi-Device Support:</strong> The same user can connect multiple times (different devices)
              without hitting the limit. The limit counts distinct users, not connections.
            </div>

            <h3>Redis Keys</h3>
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>{'online:{tenant_id}'}</code></td>
                  <td>SET</td>
                  <td>Distinct online user_ids</td>
                </tr>
                <tr>
                  <td><code>{'conncount:{tenant_id}:{user_id}'}</code></td>
                  <td>STRING (counter)</td>
                  <td>Connection reference count per user</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer className="docs-footer">
            <p>Yappa SDK v0.1.0 · MIT License</p>
          </footer>
        </main>
      </div>
    </div>
  );
}