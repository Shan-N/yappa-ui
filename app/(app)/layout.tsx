"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/app/components/auth-provider";
import { WSProvider } from "@/app/components/ws-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const router = useRouter();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // GSAP entrance animation when authenticated
  useEffect(() => {
    if (isAuthenticated && layoutRef.current) {
      gsap.fromTo(
        layoutRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center animate-pulseGlow">
            <svg
              width="20"
              height="20"
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
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WSProvider>
      <div ref={layoutRef} className="h-screen flex flex-col bg-surface-0">
        {/* Top bar */}
        <header className="h-13 flex items-center justify-between px-3 sm:px-5 border-b border-border-subtle bg-surface-50/80 backdrop-blur-md shrink-0 relative z-50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg gradient-brand flex items-center justify-center">
              <svg
                width="14"
                height="14"
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
            <span className="text-sm font-bold tracking-tight">Yappa</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              API Config
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Chat
            </button>
            <span className="text-xs text-zinc-500">
              {user?.display_name || user?.user_id}
            </span>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </>
              )}
            </svg>
          </button>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="absolute top-full right-0 left-0 bg-surface-100 border-b border-border-subtle shadow-xl z-50 sm:hidden animate-fadeIn">
              <div className="p-3 space-y-1">
                <div className="px-3 py-2 text-xs text-zinc-500 truncate">
                  {user?.display_name || user?.user_id}
                </div>
                <button
                  onClick={() => { router.push("/chat"); setMobileMenuOpen(false); }}
                  className="w-full text-left text-sm text-zinc-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Chat
                </button>
                <button
                  onClick={() => { router.push("/dashboard"); setMobileMenuOpen(false); }}
                  className="w-full text-left text-sm text-zinc-300 hover:text-white px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  API Config
                </button>
                <button
                  onClick={() => { logout(); router.push("/"); setMobileMenuOpen(false); }}
                  className="w-full text-left text-sm text-zinc-400 hover:text-white px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </div>
    </WSProvider>
  );
}
