"use client";

import { cn } from "@/app/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

import { forwardRef } from "react";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const baseStyles =
    "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-ring cursor-pointer select-none";

  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "bg-surface-200 text-white border border-border-default hover:border-border-hover hover:bg-surface-300 active:scale-[0.98]",
    ghost:
      "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-[0.98]",
    danger:
      "bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98]",
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-7 py-3.5 gap-2.5",
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || isLoading) && "opacity-50 pointer-events-none",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
