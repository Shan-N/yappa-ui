"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./docs.css";

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      // Initial Entrance Animation
      const tl = gsap.timeline();

      // Sidebar entrance
      tl.from(".sidebar", {
        x: -50,
        opacity: 0,
        duration: 1,
        ease: "power4.out"
      });

      // Nav items stagger
      tl.from(".nav-link, .nav-section-title, .logo", {
        x: -20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.05,
        ease: "power3.out"
      }, "-=0.6");

      // Main header entrance
      tl.from(".hero-header > *", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: "power4.out"
      }, "-=1.2");

      // Scroll Animations for Sections
      const sections = gsap.utils.toArray('.section');
      
      sections.forEach((section: any) => {
        gsap.to(section, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        });
      });
    }, containerRef);

    // Smooth scroll and active state setup
    const handleNavClick = (e: Event) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;
      const targetId = target.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetSection = document.querySelector(targetId) as HTMLElement;
        if (targetSection) {
          window.scrollTo({
            top: targetSection.offsetTop - 80,
            behavior: 'smooth'
          });
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          target.classList.add('active');
        }
      }
    };

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.addEventListener('click', handleNavClick));

    // Intersection Observer to update active nav link on scroll
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -80% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => observer.observe(section));

    return () => {
      ctx.revert();
      navLinks.forEach(link => link.removeEventListener('click', handleNavClick));
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="docs-page">
      <div className="container">
        <nav className="sidebar">
          <div className="sidebar-header">
            <Link href="/" className="logo">
              <div className="logo-icon"></div>
              Yappa
            </Link>
          </div>
          <div className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">Getting Started</div>
              <a href="#introduction" className="nav-link">Introduction</a>
              <a href="#architecture" className="nav-link">Architecture</a>
              <a href="#installation" className="nav-link">Installation</a>
              <a href="#quickstart" className="nav-link">Quick Start</a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">Core Operations</div>
              <a href="#connection" className="nav-link">Connection Flow</a>
              <a href="#messaging" className="nav-link">Direct Messages</a>
              <a href="#groups" className="nav-link">Groups</a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">Configuration</div>
              <a href="#options" className="nav-link">Options</a>
              <a href="#auth" className="nav-link">Authentication</a>
              <a href="#reconnection" className="nav-link">Reconnection</a>
            </div>
            <div className="nav-section">
              <div className="nav-section-title">SDK Reference</div>
              <a href="#client" className="nav-link">RealtimeClient</a>
              <a href="#events" className="nav-link">Events</a>
              <a href="#types" className="nav-link">Types</a>
            </div>
          </div>
        </nav>

        <main className="main">
          <div className="hero-header">
            <h1 className="page-title">SDK Documentation</h1>
            <p className="page-subtitle">TypeScript/JavaScript SDK for Yappa RT — a production-grade, multi-tenant WebSocket messaging engine.</p>
          </div>

          <section id="introduction" className="section">
            <h2 className="section-title">Introduction</h2>
            
            <p>Yappa SDK is the official client for <strong>Yappa RT</strong>, a horizontally scalable WebSocket server built with Rust (Axum/Tokio). It provides real-time messaging with complete tenant isolation, JWT authentication, and cross-node message delivery via Redis pub/sub.</p>

            <div className="card-grid">
              <div className="card">
                <div className="card-title">Multi-Tenant</div>
                <div className="card-desc">Complete isolation with configurable user limits per tenant.</div>
              </div>
              <div className="card">
                <div className="card-title">Scale-Out</div>
                <div className="card-desc">Stateless servers with Redis pub/sub for cross-node routing.</div>
              </div>
              <div className="card">
                <div className="card-title">JWT Auth</div>
                <div className="card-desc">HS256 tokens strictly binding tenant_id and user_id claims.</div>
              </div>
            </div>
          </section>

          <section id="architecture" className="section">
            <h2 className="section-title">System Architecture</h2>
            
            <p>Messages flow through multiple layers to ensure delivery across nodes:</p>

            <div className="architecture-diagram">
{`                    ┌─────────────────────┐
                    │    Load Balancer    │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ┌───────────┐         ┌───────────┐         ┌───────────┐
   │  WS Node  │         │  WS Node  │         │  WS Node  │
   │ (Rust)    │         │ (Rust)    │         │ (Rust)    │
   └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    ▼                          ▼                          ▼
┌────────┐              ┌────────────┐              ┌────────────┐
│ Redis  │              │   Kafka    │              │ PostgreSQL │
└────────┘              └────────────┘              └────────────┘`}
            </div>
          </section>

          <section id="quickstart" className="section">
            <h2 className="section-title">Quick Start</h2>
            
            <pre><code><span className="keyword">import</span> {'{'} <span className="type">RealtimeClient</span> {'}'} <span className="keyword">from</span> <span className="string">'@yappa-rs/yappa-sdk'</span>;

<span className="comment">// 1. Initialize with your JWT token</span>
<span className="keyword">const</span> client = <span className="keyword">new</span> <span className="function">RealtimeClient</span>({'{'}
  <span className="property">url</span>: <span className="string">'wss://your-server.com/ws'</span>,
  <span className="property">token</span>: <span className="string">'eyJhbGciOiJIUzI1NiIs...'</span>,
  <span className="property">authMode</span>: <span className="string">'query'</span>
{'}'});

<span className="comment">// 2. Listen for messages</span>
client.<span className="function">on</span>(<span className="string">'message'</span>, (msg) ={'>'} {'{'}
  console.<span className="function">log</span>(<span className="string">{`\\[\${msg.channel_type}\\] \${msg.sender_id}: \${msg.payload.text}`}</span>);
{'}'});

<span className="comment">// 3. Connect</span>
<span className="keyword">await</span> client.<span className="function">connect</span>();

<span className="comment">// 4. Send a direct message</span>
client.<span className="function">sendDM</span>(<span className="string">'bob_123'</span>, <span className="string">'Hello Bob!'</span>);</code></pre>
          </section>

          <section id="connection" className="section">
            <h2 className="section-title">Connection Flow</h2>
            
            <p>When you call <code>client.connect()</code>, the following sequence occurs sequentially:</p>

            <div className="flow-box">
              <div className="flow-step">
                <div className="flow-title">1. WebSocket Upgrade Request</div>
                <div className="flow-desc">Opens WebSocket to <code>/ws</code> endpoint with JWT in Authorization header or query string.</div>
              </div>
              <div className="flow-step">
                <div className="flow-title">2. JWT Validation</div>
                <div className="flow-desc">Validates HS256 signature, extracts <code>tenant_id</code> and <code>user_id</code> from claims.</div>
              </div>
              <div className="flow-step">
                <div className="flow-title">3. Tenant Limit Check</div>
                <div className="flow-desc">Atomically checks if tenant is under <code>MAX_USERS_PER_TENANT</code> limit via Redis Lua script.</div>
              </div>
            </div>
          </section>

          <section id="types" className="section">
            <h2 className="section-title">Type Definitions</h2>
            
            <h3>ServerMessage</h3>
            <pre><code><span className="keyword">interface</span> <span className="type">ServerMessage</span> {'{'}
  <span className="property">type</span>: <span className="type">string</span>;              <span className="comment">// "chat" or "group_join"</span>
  <span className="property">message_id</span>: <span className="type">string</span>;        <span className="comment">// UUID v4</span>
  <span className="property">tenant_id</span>: <span className="type">string</span>;
  <span className="property">channel_type</span>: <span className="type">ChannelType</span>;
  <span className="property">channel_id</span>: <span className="type">string</span>;        <span className="comment">// recipient user_id or group_id</span>
  <span className="property">sender_id</span>: <span className="type">string</span>;
  <span className="property">timestamp</span>: <span className="type">number</span>;         <span className="comment">// Unix seconds</span>
  <span className="property">conversation_id</span>: <span className="type">string</span>;   <span className="comment">// UUID (DM: derived from participants, Group: group_id)</span>
  <span className="property">payload</span>: {'{'}
    <span className="property">text</span>: <span className="type">string</span>;
    <span className="property">meta</span>: <span className="type">Record</span>&lt;<span className="type">string</span>, <span className="type">unknown</span>&gt;;
  {'}'};
{'}'}</code></pre>

            <h3>ChannelType</h3>
            <pre><code><span className="keyword">type</span> <span className="type">ChannelType</span> = <span className="string">"DM"</span> | <span className="string">"GROUP"</span>;</code></pre>
          </section>
        </main>
      </div>
    </div>
  );
}
