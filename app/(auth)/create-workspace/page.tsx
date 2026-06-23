"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import { useAuth } from "@/app/components/auth-provider";
import { useToast } from "@/app/components/ui/toast";
import { getErrorMessage } from "@/app/lib/api";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { createWorkspace, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // Modal Takeover
      if (modalRef.current) {
        tl.fromTo(
          modalRef.current,
          { scale: 0.95, opacity: 0, backdropFilter: "blur(0px)" },
          { scale: 1, opacity: 1, backdropFilter: "blur(10px)", duration: 0.8 }
        );
      }

      tl.from(".cw-logo", {
        scale: 0.5,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
      }, "-=0.6");

      tl.from(
        ".cw-title",
        { y: 20, opacity: 0, duration: 0.5 },
        "-=0.2"
      );

      if (formRef.current) {
        const fields = Array.from(formRef.current.querySelectorAll(".form-field"));
        tl.from(
          fields,
          {
            y: 25,
            opacity: 0,
            stagger: 0.08,
            duration: 0.5,
          },
          "-=0.2"
        );
      }

      tl.from(
        ".cw-btn",
        { y: 20, opacity: 0, duration: 0.5, ease: "back.out(1.7)" },
        "-=0.1"
      );

      tl.from(".cw-footer", { opacity: 0, duration: 0.4 }, "-=0.2");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsProvisioning(true);

    // Play provisioning animation
    if (formRef.current && loaderRef.current) {
      const state = Flip.getState(formRef.current);
      formRef.current.style.display = "none";
      loaderRef.current.style.display = "flex";
      Flip.from(state, {
        duration: 0.6,
        ease: "power4.inOut",
        onComplete: () => {
          gsap.fromTo(
            ".provision-step",
            { y: 10, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.2, duration: 0.5 }
          );
        }
      });
    }

    try {
      await createWorkspace(tenantId, name, userId, password, displayName || undefined);
      // Let the animation finish at least a bit before redirecting
      setTimeout(() => {
        toast("Workspace created! Welcome to Yappa.", "success");
        router.push("/chat");
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsProvisioning(false);
      if (formRef.current && loaderRef.current) {
        loaderRef.current.style.display = "none";
        formRef.current.style.display = "block";
        gsap.fromTo(formRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      }
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 grid-bg opacity-40" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/5 blur-[120px] pointer-events-none" />

      <div ref={modalRef} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="cw-logo flex justify-center mb-8">
          <div className="h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-white/5">
            <svg
              width="24"
              height="24"
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
        </div>

        <div className="cw-title text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Create your workspace</h1>
          <p className="text-sm text-zinc-400">
            Set up a workspace for your team in seconds
          </p>
        </div>

        {/* Provisioning Loader */}
        <div ref={loaderRef} className="hidden glass-strong rounded-2xl p-10 flex-col items-center justify-center space-y-6">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-surface-400" />
            <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2 text-sm font-mono text-zinc-400">
            <p className="provision-step text-zinc-400">Initializing tenant container...</p>
            <p className="provision-step">Allocating Redis Pub/Sub channels...</p>
            <p className="provision-step">Securing WebSocket endpoints...</p>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="glass-strong rounded-2xl p-7 space-y-4"
        >
          {error && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-300">
              {error}
            </div>
          )}

          <div className="form-field">
            <Input
              label="Workspace ID"
              placeholder="e.g. acme-corp"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="font-mono"
              required
              autoFocus
            />
            <p className="text-xs text-zinc-500 mt-1">
              Letters, numbers, and hyphens only
            </p>
          </div>

          <div className="form-field">
            <Input
              label="Workspace Name"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="h-px bg-border-subtle my-1" />

          <div className="form-field">
            <Input
              label="Your Username"
              placeholder="e.g. alice"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              required
            />
          </div>

          <div className="form-field">
            <Input
              label="Display Name"
              placeholder="e.g. Alice"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="cw-btn pt-1">
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              Create Workspace
            </Button>
          </div>
        </form>

        <div className="cw-footer mt-6 text-center text-sm text-zinc-500">
          Already have a workspace?{" "}
          <Link
            href="/login"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
