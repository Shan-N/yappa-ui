"use client";

import { cn } from "@/app/lib/utils";
import type { InputHTMLAttributes } from "react";
import { useRef } from "react";
import gsap from "gsap";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const inputRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (labelRef.current) {
      gsap.to(labelRef.current, { color: "white", x: 2, duration: 0.3, ease: "power2.out" });
    }
    if (inputRef.current) {
      gsap.to(inputRef.current, { borderColor: "white", boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.2)", duration: 0.3, ease: "power2.out" });
    }
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (labelRef.current) {
      gsap.to(labelRef.current, { color: "var(--color-surface-300)", x: 0, duration: 0.3, ease: "power2.out", clearProps: "color" });
    }
    if (inputRef.current) {
      gsap.to(inputRef.current, { borderColor: "var(--color-border-default)", boxShadow: "none", duration: 0.3, ease: "power2.out", clearProps: "borderColor,boxShadow" });
    }
    props.onBlur?.(e);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          ref={labelRef}
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full rounded-xl bg-surface-200 border border-border-default px-4 py-2.5 text-sm text-white placeholder-zinc-500",
            "transition-colors duration-200",
            "hover:border-border-hover",
            "focus:outline-none",
            !!icon && "pl-10",
            !!error && "border-zinc-500/50 focus:border-white focus:ring-white/20",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-zinc-400 mt-1">{error}</p>
      )}
    </div>
  );
}
