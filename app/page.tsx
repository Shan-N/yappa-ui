"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/app/components/auth-provider";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<SVGSVGElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Timeline: Hero entrance ──
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Nav slides down
      tl.from(navRef.current, {
        y: -40,
        opacity: 0,
        duration: 0.8,
      });

      // Badge pops in
      tl.from(
        badgeRef.current,
        {
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
        },
        "-=0.3"
      );

      // Heading splits in word by word
      if (headingRef.current) {
        const words = Array.from(headingRef.current.querySelectorAll(".word"));
        tl.from(
          words,
          {
            y: 40,
            opacity: 0,
            rotationX: -40,
            stagger: 0.08,
            duration: 1.2,
            ease: "elastic.out(1, 0.7)",
          },
          "-=0.3"
        );
      }

      // Subtext fades up
      tl.from(
        subRef.current,
        {
          y: 30,
          opacity: 0,
          duration: 0.7,
        },
        "-=0.4"
      );

      // CTA buttons spring in
      if (ctaRef.current) {
        tl.from(
          Array.from(ctaRef.current.children),
          {
            y: 40,
            opacity: 0,
            scale: 0.95,
            stagger: 0.12,
            duration: 1.2,
            ease: "elastic.out(1, 0.7)",
          },
          "-=0.3"
        );
      }

      // ── Background Network Nodes ──
      if (networkRef.current) {
        const nodes = Array.from(networkRef.current.querySelectorAll("circle"));
        const lines = Array.from(networkRef.current.querySelectorAll("line"));

        gsap.to(nodes, {
          y: "random(-20, 20)",
          x: "random(-20, 20)",
          duration: "random(4, 8)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.1,
        });

        gsap.to(lines, {
          opacity: "random(0.1, 0.4)",
          duration: "random(2, 4)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.2,
        });
      }

      // ── Grid background subtle movement ──
      gsap.to(gridRef.current, {
        backgroundPosition: "40px 40px",
        duration: 20,
        repeat: -1,
        ease: "none",
      });

      // ── Features: delayed stagger (no ScrollTrigger needed since they're near viewport) ──
      if (featuresRef.current) {
        const cards = Array.from(featuresRef.current.querySelectorAll(".feature-card"));
        tl.from(
          cards,
          {
            y: 60,
            opacity: 0,
            stagger: 0.15,
            duration: 0.8,
            ease: "power2.out",
          },
          "-=0.2"
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Split heading text into word spans for GSAP
  const headingWords = ["Real-time", "chat", "for", "modern", "teams."];

  return (
    <div ref={heroRef} className="relative min-h-screen overflow-hidden">
      {/* ── Grid Background ── */}
      <div ref={gridRef} className="fixed inset-0 grid-bg opacity-30" />

      {/* ── Background Network SVG ── */}
      <svg
        ref={networkRef}
        className="fixed inset-0 w-full h-full pointer-events-none opacity-20 mix-blend-screen"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="white" strokeWidth="1" opacity="0.2">
          <line x1="200" y1="200" x2="400" y2="300" />
          <line x1="400" y1="300" x2="600" y2="150" />
          <line x1="600" y1="150" x2="800" y2="400" />
          <line x1="400" y1="300" x2="500" y2="600" />
          <line x1="500" y1="600" x2="800" y2="400" />
          <line x1="500" y1="600" x2="300" y2="800" />
          <line x1="800" y1="400" x2="900" y2="700" />
          <line x1="500" y1="600" x2="900" y2="700" />
        </g>
        <g fill="white" opacity="0.5">
          <circle cx="200" cy="200" r="4" />
          <circle cx="400" cy="300" r="6" />
          <circle cx="600" cy="150" r="5" />
          <circle cx="800" cy="400" r="8" />
          <circle cx="500" cy="600" r="7" />
          <circle cx="300" cy="800" r="5" />
          <circle cx="900" cy="700" r="6" />
        </g>
      </svg>

      {/* ── Navigation ── */}
      <nav
        ref={navRef}
        className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">Yappa</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/create-workspace"
            className="text-sm font-medium gradient-brand text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 md:pt-32 pb-20">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="mb-8 glass rounded-full px-4 py-1.5 text-xs font-medium text-zinc-300 flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Now in beta — Deploy on your own infra
        </div>

        {/* Heading with word-by-word animation */}
        <h1
          ref={headingRef}
          className="text-center text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6 overflow-hidden"
          style={{ perspective: "800px" }}
        >
          {headingWords.map((word, i) => (
            <span
              key={i}
              className="word inline-block mr-[0.25em]"
              style={{
                transformOrigin: "center bottom",
              }}
            >
              {word === "Real-time" || word === "teams." ? (
                <span className="gradient-brand-text">{word}</span>
              ) : (
                word
              )}
            </span>
          ))}
        </h1>

        {/* Subtext */}
        <p
          ref={subRef}
          className="text-center text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed"
        >
          Secure, self-hosted messaging with workspaces, groups, and direct
          messages. Set up in minutes, deploy on your infrastructure.
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/create-workspace"
            className="group relative inline-flex items-center gap-2.5 gradient-brand text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            Create Workspace
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 glass text-zinc-300 hover:text-white font-medium px-8 py-4 rounded-2xl text-lg transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section
        ref={featuresRef}
        className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
              title: "Real-time WebSocket",
              desc: "Instant message delivery via a high-performance Rust WebSocket server with pub/sub architecture.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ),
              title: "Secure by Default",
              desc: "JWT authentication, HTTP-only refresh cookies, and tenant isolation. Your data stays on your infra.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
              title: "Team Workspaces",
              desc: "Multi-tenant workspaces with up to 10 users. DMs, group channels, and admin controls built-in.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="feature-card glass rounded-2xl p-7 hover:bg-white/[0.04] transition-all duration-300 group"
            >
              <div className="h-11 w-11 rounded-xl bg-brand-600/15 text-brand-400 flex items-center justify-center mb-5 group-hover:bg-brand-600/25 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border-subtle px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-zinc-500">
          <span>© 2026 Yappa</span>
          <span>Self-hosted real-time messaging</span>
        </div>
      </footer>
    </div>
  );
}
