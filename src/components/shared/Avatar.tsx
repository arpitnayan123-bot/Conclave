"use client";

import { avatarGradient, initials } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid place-items-center rounded-full font-semibold text-white shrink-0 ring-1 ring-white/15",
        sizes[size],
        className
      )}
      style={{ background: avatarGradient(name) }}
    >
      {initials(name)}
    </span>
  );
}
