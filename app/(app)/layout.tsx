"use client";

import { useEffect, useRef } from "react";
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
        <header className="h-13 flex items-center justify-between px-5 border-b border-border-subtle bg-surface-50/80 backdrop-blur-md shrink-0">
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

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/docs")}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Docs
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
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </div>
    </WSProvider>
  );
}
