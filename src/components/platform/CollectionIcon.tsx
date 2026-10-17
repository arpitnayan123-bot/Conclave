"use client";

import {
  Briefcase,
  Compass,
  Crown,
  Folder,
  Gem,
  Handshake,
  Key,
  Layers,
  Pin,
  Scale,
  Sparkles,
  Star,
  Target,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import {
  COLLECTION_ICONS,
  COLLECTION_ICON_LABELS,
  DEFAULT_COLLECTION_ICON,
  type CollectionIconId,
} from "@/lib/collection-icons";
import { cn } from "@/lib/utils";

const GLYPHS: Record<CollectionIconId, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  gem: Gem,
  crown: Crown,
  compass: Compass,
  scale: Scale,
  telescope: Telescope,
  key: Key,
  star: Star,
  sparkles: Sparkles,
  target: Target,
  layers: Layers,
  handshake: Handshake,
  pin: Pin,
};

/** Renders a collection's glyph by id — falls back to the folder mark. */
export function CollectionIcon({
  id,
  className,
  strokeWidth = 2,
  "aria-hidden": ariaHidden,
}: {
  id: string | null | undefined;
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  const Glyph = GLYPHS[(id ?? DEFAULT_COLLECTION_ICON) as CollectionIconId] ?? Folder;
  return <Glyph className={className} strokeWidth={strokeWidth} aria-hidden={ariaHidden ?? true} />;
}

/**
 * The icon picker — a compact radiogroup of the curated glyphs.
 * Used in the create-folder form and the change-icon popover.
 */
export function CollectionIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: CollectionIconId) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Collection icon"
      className="grid grid-cols-7 gap-1"
    >
      {COLLECTION_ICONS.map((id) => {
        const active = id === value;
        const Glyph = GLYPHS[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={COLLECTION_ICON_LABELS[id]}
            title={COLLECTION_ICON_LABELS[id]}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg border transition-all duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-gold/60 bg-gold/15 text-gold shadow-[0_0_14px_-4px_oklch(0.84_0.13_85/55%)]"
                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-card/60 hover:text-foreground"
            )}
          >
            <Glyph className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
