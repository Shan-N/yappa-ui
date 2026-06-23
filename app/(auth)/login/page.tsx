"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import { useAuth } from "@/app/components/auth-provider";
import { useToast } from "@/app/components/ui/toast";
import { getErrorMessage } from "@/app/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(
        errorRef.current,
        { x: -10 },
        {
          x: 0,
          duration: 0.4,
          ease: "elastic.out(2, 0.3)",
          clearProps: "x"
        }
      );
    }
  }, [error]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/chat");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".login-logo", {
        scale: 0.5,
        opacity: 0,
        duration: 0.6,
      });

      tl.from(
        ".login-title",
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
        },
        "-=0.2"
      );

      if (formRef.current) {
        const fields = Array.from(formRef.current.querySelectorAll(".form-field"));
        tl.from(
          fields,
          {
            x: -30,
            opacity: 0,
            stagger: 0.1,
            duration: 0.5,
          },
          "-=0.2"
        );
      }

      tl.from(
        ".login-btn",
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: "back.out(1.7)",
        },
        "-=0.1"
      );

      tl.from(
        ".login-footer",
        {
          opacity: 0,
          duration: 0.4,
        },
        "-=0.2"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(tenantId, userId, password);
      toast("Welcome back!", "success");
      router.push("/chat");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Background elements */}
      <div className="fixed inset-0 grid-bg opacity-40" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-white/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="login-logo flex justify-center mb-8">
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

        <div className="login-title text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-sm text-zinc-400">
            Sign in to your workspace
          </p>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="glass-strong rounded-2xl p-7 space-y-5"
        >
          {error && (
            <div ref={errorRef} className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-300">
              {error}
            </div>
          )}

          <div className="form-field">
            <Input
              label="Workspace ID"
              placeholder="e.g. acme-corp"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="font-mono"
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <Input
              label="Username"
              placeholder="e.g. alice"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
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

          <div className="login-btn">
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="login-footer mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have a workspace?{" "}
          <Link
            href="/create-workspace"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
