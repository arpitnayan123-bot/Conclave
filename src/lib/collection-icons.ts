/**
 * The curated icon set for collection folders — the single source of truth.
 * The API (server) validates against this allowlist; the picker (client)
 * maps each id to its Lucide glyph in <CollectionIcon>.
 *
 * Voice rule: the club speaks in petition / deliberation / invitation —
 * no forge, fire or steel glyphs here.
 */
export const COLLECTION_ICONS = [
  "folder",
  "briefcase",
  "gem",
  "crown",
  "compass",
  "scale",
  "telescope",
  "key",
  "star",
  "sparkles",
  "target",
  "layers",
  "handshake",
  "pin",
] as const;

export type CollectionIconId = (typeof COLLECTION_ICONS)[number];

export const DEFAULT_COLLECTION_ICON: CollectionIconId = "folder";

export function isCollectionIcon(v: unknown): v is CollectionIconId {
  return typeof v === "string" && (COLLECTION_ICONS as readonly string[]).includes(v);
}

/** Human label for the picker (aria-labels + tooltips). */
export const COLLECTION_ICON_LABELS: Record<CollectionIconId, string> = {
  folder: "Folder",
  briefcase: "Portfolio",
  gem: "Strong fits",
  crown: "The shortlist",
  compass: "Exploring",
  scale: "Due diligence",
  telescope: "Scouting",
  key: "Keys to the room",
  star: "Stars",
  sparkles: "Promising",
  target: "On target",
  layers: "Deep stack",
  handshake: "Handshakes",
  pin: "Pinned",
};
