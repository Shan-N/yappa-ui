"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import Button from "@/app/components/ui/button";
import Input from "@/app/components/ui/input";
import { useToast } from "@/app/components/ui/toast";
import { register, getErrorMessage } from "@/app/lib/api";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState(searchParams.get("tenant") || "");
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".reg-logo", {
        scale: 0.5,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
      });

      tl.from(".reg-title", { y: 20, opacity: 0, duration: 0.5 }, "-=0.2");

      if (formRef.current) {
        const fields = Array.from(formRef.current.querySelectorAll(".form-field"));
        tl.from(
          fields,
          { x: -30, opacity: 0, stagger: 0.1, duration: 0.5 },
          "-=0.2"
        );
      }

      tl.from(
        ".reg-btn",
        { y: 20, opacity: 0, duration: 0.5, ease: "back.out(1.7)" },
        "-=0.1"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register({
        tenant_id: tenantId,
        user_id: userId,
        password,
        display_name: displayName || undefined,
      });
      setSuccess(true);
      toast("Account created! You can now sign in.", "success");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div ref={containerRef} className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="fixed inset-0 grid-bg opacity-40" />
        <div className="relative z-10 text-center animate-fadeIn">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(52 211 153)"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">You&apos;re all set!</h2>
          <p className="text-zinc-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 grid-bg opacity-40" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-cyan-600/8 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="reg-logo flex justify-center mb-8">
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

        <div className="reg-title text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Join a workspace</h1>
          <p className="text-sm text-zinc-400">
            Create your account to start chatting
          </p>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="glass-strong rounded-2xl p-7 space-y-5"
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
              onChange={(e) => setTenantId(e.target.value)}
              required
              disabled={!!searchParams.get("tenant")}
            />
          </div>

          <div className="form-field">
            <Input
              label="Username"
              placeholder="e.g. bob"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              required
              autoFocus={!!searchParams.get("tenant")}
            />
          </div>

          <div className="form-field">
            <Input
              label="Display Name"
              placeholder="e.g. Bob Smith"
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

          <div className="reg-btn">
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
