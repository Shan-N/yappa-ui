"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/app/components/ui/button";
import Modal from "@/app/components/ui/modal";
import { useToast } from "@/app/components/ui/toast";
import gsap from "gsap";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userCount: number;
  maxUsers: number;
}

export default function InviteModal({
  isOpen,
  onClose,
  tenantId,
  userCount,
  maxUsers,
}: InviteModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<"id" | "link" | null>(null);

  const idBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && meterRef.current) {
      const percentage = Math.min((userCount / maxUsers) * 100, 100);
      const isWarning = percentage >= 80;
      
      gsap.fromTo(
        meterRef.current,
        { width: "0%", backgroundColor: "#ffffff" }, // White
        { 
          width: `${percentage}%`, 
          backgroundColor: isWarning ? "#a1a1aa" : "#ffffff", // Zinc-400 if warning, else White
          duration: 1, 
          ease: "power3.out",
          delay: 0.2
        }
      );
    }
  }, [isOpen, userCount, maxUsers]);

  const registerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?tenant=${tenantId}`
      : `/register?tenant=${tenantId}`;

  async function copyToClipboard(text: string, type: "id" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast("Copied to clipboard!", "success");

      // GSAP copy interaction
      const btn = type === "id" ? idBtnRef.current : linkBtnRef.current;
      if (btn) {
        gsap.timeline()
          .to(btn, { scale: 0.9, duration: 0.1, ease: "power2.in" })
          .to(btn, { scale: 1, backgroundColor: "#ffffff", color: "#000000", duration: 0.2, ease: "back.out(1.7)" })
          .to(btn, { backgroundColor: "", color: "", duration: 0.3, delay: 1 });
      }

      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Members">
      <div className="space-y-5">
        <p className="text-sm text-zinc-400">
          Share the workspace ID or registration link with your team members.
        </p>

        {/* Workspace ID */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Workspace ID
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-200 border border-border-default rounded-xl px-4 py-2.5 text-sm font-mono text-white">
              {tenantId}
            </div>
            <Button
              ref={idBtnRef}
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(tenantId, "id")}
            >
              {copied === "id" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Registration Link */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Registration Link
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-200 border border-border-default rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 truncate">
              {registerUrl}
            </div>
            <Button
              ref={linkBtnRef}
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(registerUrl, "link")}
            >
              {copied === "link" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Capacity Meter */}
        <div className="bg-surface-200/60 rounded-xl px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Tenant Capacity</span>
            <span className="text-sm font-mono text-white">
              {userCount} / {maxUsers}
            </span>
          </div>
          
          <div className="h-2 w-full bg-surface-400 rounded-full overflow-hidden">
            <div ref={meterRef} className="h-full rounded-full" />
          </div>

          {userCount >= maxUsers && (
            <p className="text-xs text-zinc-400 font-medium">
              Member limit reached. Please upgrade to add more.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
