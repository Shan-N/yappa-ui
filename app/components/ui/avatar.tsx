"use client";

import { getInitials, getAvatarColor, cn } from "@/app/lib/utils";
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface AvatarProps {
  name: string;
  userId: string;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
}

export default function Avatar({
  name,
  userId,
  size = "md",
  isOnline,
}: AvatarProps) {
  const initials = getInitials(name);
  const color = getAvatarColor(userId);

  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isOnline && dotRef.current) {
      gsap.fromTo(
        dotRef.current,
        { scale: 0, backgroundColor: "#52525b" }, // zinc-500
        { scale: 1, backgroundColor: "#06b6d4", duration: 0.8, ease: "elastic.out(1, 0.5)" } // cyan-500
      );
    }
  }, [isOnline]);

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white",
          color,
          sizes[size]
        )}
      >
        {initials}
      </div>
      {isOnline !== undefined && (
        <span
          ref={dotRef}
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-surface-0",
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
            isOnline ? "bg-cyan-500" : "bg-zinc-500"
          )}
        />
      )}
    </div>
  );
}
