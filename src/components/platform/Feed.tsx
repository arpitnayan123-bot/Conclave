"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowDownWideNarrow,
  Bookmark,
  Flame,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  Lightbulb,
} from "lucide-react";
import { api } from "@/lib/api";
import { IDEA_STAGES } from "@/lib/store";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommentRow, Idea } from "./types";
import IdeaManageDialogs, { type ManageState } from "./IdeaManageDialogs";
import MemberProfileDialog from "./MemberProfileDialog";
import {
  CollectionsDialog,
  CollectionsRail,
  FolderButton,
  FolderOpenDoodle,
  folderCount,
  type CollectionT,
} from "./Collections";
import {
  Chip,
  EmptyState,
  SectionHeader,
  StageBadge,
  formatDate,
  splitList,
  staggerContainer,
  staggerItem,
  timeAgo,
} from "./common";
import { cn } from "@/lib/utils";

/** shareable permalink for an idea → /#/platform?idea=ID */
function ideaPermalink(ideaId: string) {
  if (typeof window === "undefined") return `/#/platform?idea=${ideaId}`;
  return `${window.location.origin}/#/platform?idea=${ideaId}`;
}

function copyIdeaLink(ideaId: string, title: string) {
  if (!navigator.clipboard) {
    toast.error("Clipboard unavailable — copy it manually");
    return;
  }
  navigator.clipboard
    .writeText(ideaPermalink(ideaId))
    .then(() => toast.success(`Link to "${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" copied`))
    .catch(() => toast.error("Couldn't copy the link"));
}

const bookmarkBusy = new Set<string>();

/** toggle save-for-later; optimistic via parent state sync */
async function toggleBookmark(idea: Idea, onBookmarked?: (id: string, b: boolean) => void) {
  if (bookmarkBusy.has(idea.id)) return; // double-click guard — one flight per idea
  bookmarkBusy.add(idea.id);
  const next = !idea.bookmarked;
  onBookmarked?.(idea.id, next); // optimistic
  try {
    const res = await api<{ bookmarked: boolean }>(`/ideas/${idea.id}/bookmark`, { method: "POST" });
    if (res.bookmarked !== next) onBookmarked?.(idea.id, res.bookmarked); // reconcile
    if (res.bookmarked) toast.success("Saved — find it under the Saved tab");
  } catch (err) {
    onBookmarked?.(idea.id, !next); // roll back
    toast.error((err as Error).message);
  } finally {
    bookmarkBusy.delete(idea.id);
  }
}

type FeedProps = {
  ideas: Idea[];
  meId: string;
  loading: boolean;
  onCreated: (idea: Idea) => void;
  onInterestAdded: (ideaId: string, message: string) => void;
  onInterestRemoved: (ideaId: string) => void;
  postOpen: boolean;
  onPostOpenChange: (open: boolean) => void;
  onIdeaUpdated: (idea: Idea) => void;
  onIdeaDeleted: (ideaId: string) => void;
  onCountChange: (ideaId: string, commentCount: number) => void;
  /** set by notification deep-links — opens the idea detail dialog once */
  openIdeaId: string | null;
  onIdeaOpened: () => void;
  /** optimistic bookmark state sync (parent owns ideas[]) */
  onBookmarked?: (ideaId: string, bookmarked: boolean) => void;
  /** Saved view: render only bookmarked ideas with a tailored header/empty state */
  savedOnly?: boolean;
};

type SortKey = "newest" | "active" | "discussed";

const SORTS: { key: SortKey; label: string; icon: typeof ArrowDownWideNarrow; title: string }[] = [
  { key: "newest", label: "Newest", icon: ArrowDownWideNarrow, title: "Sort by newest" },
  { key: "active", label: "Most seconded", icon: Flame, title: "Sort by most seconds" },
  { key: "discussed", label: "Buzz", icon: MessageSquare, title: "Sort by most discussed" },
];

const EMPTY_FORM = { title: "", pitch: "", stage: "IDEA", needs: "", tags: "" };

export default function Feed({
  ideas,
  meId,
  loading,
  onCreated,
  onInterestAdded,
  onInterestRemoved,
  postOpen,
  onPostOpenChange,
  onIdeaUpdated,
  onIdeaDeleted,
  onCountChange,
  openIdeaId,
  onIdeaOpened,
  onBookmarked,
  savedOnly = false,
}: FeedProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const [form, setForm] = useState(EMPTY_FORM);
  const [posting, setPosting] = useState(false);

  const [joinIdea, setJoinIdea] = useState<Idea | null>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null);
  const [manage, setManage] = useState<ManageState>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  /* collections (Saved tab only) */
  const [collections, setCollections] = useState<CollectionT[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("ALL");
  const [folderIdea, setFolderIdea] = useState<Idea | null>(null); // picker target (null = manager)
  const [foldersOpen, setFoldersOpen] = useState(false);
  const collectionsLoadedRef = useRef(false);

  /* load collections once when the Saved tab mounts */
  useEffect(() => {
    if (!savedOnly || collectionsLoadedRef.current) return;
    collectionsLoadedRef.current = true;
    api<{ collections: CollectionT[] }>("/collections")
      .then((r) => setCollections(r.collections))
      .catch(() => {}); // fail-silent: rail simply shows nothing extra
  }, [savedOnly]);

  /* if the active folder was deleted (e.g. in the manager), fall back to All saved */
  useEffect(() => {
    if (activeCollection !== "ALL" && !collections.some((c) => c.id === activeCollection)) {
      setActiveCollection("ALL");
    }
  }, [collections, activeCollection]);

  /* bookmark flips: keep collections in sync when an idea is unsaved */
  const handleBookmarked = useCallback(
    (ideaId: string, bookmarked: boolean) => {
      onBookmarked?.(ideaId, bookmarked);
      if (!bookmarked) {
        setCollections((prev) =>
          prev.map((c) =>
            c.ideaIds.includes(ideaId)
              ? { ...c, ideaIds: c.ideaIds.filter((id) => id !== ideaId) }
              : c
          )
        );
      }
    },
    [onBookmarked]
  );

  /* base list: in savedOnly mode, narrowed by the active collection folder */
  const baseList = useMemo(() => {
    if (!savedOnly || activeCollection === "ALL") return ideas;
    const c = collections.find((x) => x.id === activeCollection);
    if (!c) return ideas;
    return ideas.filter((i) => c.ideaIds.includes(i.id));
  }, [savedOnly, ideas, activeCollection, collections]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: baseList.length };
    for (const s of IDEA_STAGES) counts[s] = 0;
    for (const idea of baseList) counts[idea.stage] = (counts[idea.stage] ?? 0) + 1;
    return counts;
  }, [baseList]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = baseList.filter((idea) => {
      if (stageFilter !== "ALL" && idea.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        idea.title.toLowerCase().includes(q) ||
        idea.pitch.toLowerCase().includes(q) ||
        idea.tags.toLowerCase().includes(q)
      );
    });
    if (sort === "active") {
      return [...list].sort((a, b) => b.interests.length - a.interests.length);
    }
    if (sort === "discussed") {
      return [...list].sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0));
    }
    return list; // API already returns newest first
  }, [baseList, stageFilter, q, sort]);

  /* notification deep-link: open the focused idea's detail dialog once ideas are loaded */
  useEffect(() => {
    if (!openIdeaId || ideas.length === 0) return;
    onIdeaOpened();
    const target = ideas.find((i) => i.id === openIdeaId);
    if (target) {
      setDetailIdea(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [openIdeaId, ideas, onIdeaOpened]);

  /* keep the open detail dialog in sync with parent idea state (bookmark flips, edits) */
  useEffect(() => {
    if (!detailIdea) return;
    const fresh = ideas.find((i) => i.id === detailIdea.id);
    if (fresh && fresh !== detailIdea) setDetailIdea(fresh);
  }, [ideas, detailIdea]);

  /* ---------- actions ---------- */

  async function submitIdea() {
    if (form.title.trim().length < 4) {
      toast.error("Give your venture a clear title (at least 4 characters)");
      return;
    }
    if (form.pitch.trim().length < 40) {
      toast.error("Describe your venture in at least 40 characters");
      return;
    }
    setPosting(true);
    try {
      const res = await api<{ idea: Idea }>("/ideas", { body: form });
      onCreated(res.idea);
      onPostOpenChange(false);
      setForm(EMPTY_FORM);
      toast.success("Venture presented — the room can see it now");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function toggleInterest(idea: Idea, message: string) {
    setBusyId(idea.id);
    try {
      const res = await api<{ interested: boolean }>(`/ideas/${idea.id}/interest`, {
        body: { message },
      });
      if (res.interested) {
        onInterestAdded(idea.id, message);
        toast.success("Seconded — the founder has been notified");
      } else {
        onInterestRemoved(idea.id);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function confirmJoin() {
    if (!joinIdea) return;
    const idea = joinIdea;
    setJoinIdea(null);
    setJoinMessage("");
    void toggleInterest(idea, joinMessage.trim());
  }

  /* ---------- render ---------- */

  return (
    <section aria-label={savedOnly ? "Saved ventures" : "Venture feed — The Room"} className="space-y-6">
      <SectionHeader
        title={savedOnly ? "Saved ventures" : "Ventures"}
        subtitle={
          savedOnly
            ? activeCollection === "ALL"
              ? `${ideas.length} venture${ideas.length === 1 ? "" : "s"} in your reading list`
              : `${baseList.length} in ${collections.find((c) => c.id === activeCollection)?.name ?? "folder"} · ${ideas.length} saved total`
            : `${ideas.length} venture${ideas.length === 1 ? "" : "s"} before the circle`
        }
        right={
          savedOnly ? undefined : (
            <Button onClick={() => onPostOpenChange(true)}>
              <Plus aria-hidden /> Present a venture
            </Button>
          )
        }
      />

      {/* collections rail (Saved tab) */}
      {savedOnly ? (
        <CollectionsRail
          collections={collections}
          activeId={activeCollection}
          bookmarkedCount={ideas.length}
          onSelect={setActiveCollection}
          onManage={() => {
            setFolderIdea(null);
            setFoldersOpen(true);
          }}
        />
      ) : null}

      {/* filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, pitch or tag…"
            className="pl-9"
            aria-label="Search ventures"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by stage">
          {(["ALL", ...IDEA_STAGES] as string[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(s)}
              aria-pressed={stageFilter === s}
              className={cn(
                "inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                stageFilter === s
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {s === "ALL" ? "All" : s}
              <span className="ml-1.5 text-[10px] opacity-70">{stageCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* sort — segmented control */}
      <div
        role="group"
        aria-label="Sort ventures"
        className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/40 p-0.5"
      >
        {SORTS.map((s) => {
          const active = sort === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              aria-pressed={active}
              title={s.title}
              className={cn(
                "inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <s.icon className="h-3.5 w-3.5" aria-hidden />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : baseList.length === 0 ? (
        savedOnly ? (
          activeCollection !== "ALL" ? (
            <EmptyState
              icon={<FolderOpenDoodle aria-hidden className="h-6 w-6" />}
              title="This folder is empty"
              copy="Open any saved venture and use the folders button to file it here."
              action={
                <Button variant="outline" onClick={() => setActiveCollection("ALL")}>
                  Show all saved
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Bookmark className="h-6 w-6" aria-hidden />}
              title="Nothing saved yet"
              copy="Tap the bookmark on any venture to keep it here for later — perfect for comparing co-founder fits before you commit."
            />
          )
        ) : (
          <EmptyState
            icon={<Lightbulb className="h-6 w-6" aria-hidden />}
            title="No ventures yet"
            copy="Be the first to lay a venture before the circle. Even a rough sketch starts conversation."
            action={
              <Button onClick={() => onPostOpenChange(true)}>
                <Plus aria-hidden /> Present the first venture
              </Button>
            }
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" aria-hidden />}
          title="Nothing matches"
          copy="Try a different search term or switch the stage filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStageFilter("ALL");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <motion.div
          key={`${stageFilter}-${sort}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {filtered.map((idea) => (
            <motion.div key={idea.id} variants={staggerItem} className="h-full">
              <IdeaCard
                idea={idea}
                meId={meId}
                busy={busyId === idea.id}
                onJoin={() => {
                  setJoinIdea(idea);
                  setJoinMessage("");
                }}
                onLeave={() => void toggleInterest(idea, "")}
                onOpen={() => setDetailIdea(idea)}
                onManage={(mode) => setManage({ idea, mode })}
                onViewProfile={(id) => setProfileId(id)}
                onToggleBookmark={() => void toggleBookmark(idea, handleBookmarked)}
                savedOnly={savedOnly}
                folders={folderCount(collections, idea.id)}
                onOpenFolders={() => {
                  setFolderIdea(idea);
                  setFoldersOpen(true);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* post idea dialog */}
      <Dialog open={postOpen} onOpenChange={onPostOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">Present a venture</DialogTitle>
            <DialogDescription>
              Share what you&apos;re building. Other members can second it and join you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="idea-title">Title</Label>
              <Input
                id="idea-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Campus cargo — drone deliveries between hostels"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idea-pitch">Pitch</Label>
              <Textarea
                id="idea-pitch"
                value={form.pitch}
                onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))}
                placeholder="What is it, who is it for, why now? Minimum 40 characters."
                className="min-h-28"
                maxLength={4000}
              />
              <p className="text-xs text-muted-foreground">
                {form.pitch.trim().length < 40
                  ? `${form.pitch.trim().length}/40 min characters`
                  : `${form.pitch.length} characters · 4000 max`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="idea-stage">Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}
                >
                  <SelectTrigger id="idea-stage" className="w-full">
                    <SelectValue placeholder="Pick a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {IDEA_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-needs">Looking for</Label>
                <Input
                  id="idea-needs"
                  value={form.needs}
                  onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))}
                  placeholder="e.g. Tech co-founder, ML"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idea-tags">Tags</Label>
              <Input
                id="idea-tags"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="Comma separated — e.g. ai, logistics, hardware"
                maxLength={160}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onPostOpenChange(false)} disabled={posting}>
              Cancel
            </Button>
            <Button onClick={() => void submitIdea()} disabled={posting}>
              {posting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Posting…
                </>
              ) : (
                <>
                  <Flame aria-hidden /> Present to the circle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* join-interest dialog (first-time message) */}
      <Dialog
        open={joinIdea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setJoinIdea(null);
            setJoinMessage("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">
              Second &ldquo;{joinIdea?.title}&rdquo;
            </DialogTitle>
            <DialogDescription>
              Optional: add a one-line note so {joinIdea?.author.name.split(" ")[0] ?? "the founder"}{" "}
              knows who&apos;s stepping forward. You can step out anytime.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmJoin();
            }}
          >
            <Input
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              maxLength={140}
              placeholder="e.g. I've shipped two ML side-projects — happy to own the tech"
              aria-label="One-line message (optional)"
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setJoinIdea(null);
                  setJoinMessage("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busyId === joinIdea?.id}>
                <Flame aria-hidden /> I second this venture
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* idea detail dialog */}
      <IdeaDetailDialog
        idea={detailIdea}
        meId={meId}
        busy={detailIdea ? busyId === detailIdea.id : false}
        onClose={() => setDetailIdea(null)}
        onJoin={() => {
          const idea = detailIdea;
          setDetailIdea(null);
          if (idea) {
            setJoinIdea(idea);
            setJoinMessage("");
          }
        }}
        onLeave={() => {
          const idea = detailIdea;
          setDetailIdea(null);
          if (idea) void toggleInterest(idea, "");
        }}
        onEdit={() => {
          const idea = detailIdea;
          setDetailIdea(null);
          if (idea) setManage({ idea, mode: "edit" });
        }}
        onDelete={() => {
          const idea = detailIdea;
          setDetailIdea(null);
          if (idea) setManage({ idea, mode: "delete" });
        }}
        onViewProfile={(id) => {
          setDetailIdea(null);
          setProfileId(id);
        }}
        onCountChange={onCountChange}
        onToggleBookmark={() => {
          if (detailIdea) void toggleBookmark(detailIdea, handleBookmarked);
        }}
        savedOnly={savedOnly}
        folders={detailIdea ? folderCount(collections, detailIdea.id) : 0}
        onOpenFolders={() => {
          setFolderIdea(detailIdea);
          setFoldersOpen(true);
        }}
      />
      {/* collections picker / manager (Saved tab) */}
      {savedOnly ? (
        <CollectionsDialog
          open={foldersOpen}
          onOpenChange={setFoldersOpen}
          idea={folderIdea}
          collections={collections}
          onCollectionsChange={setCollections}
          onBookmarked={handleBookmarked}
        />
      ) : null}
      {/* author manage (edit/delete) dialogs */}
      <IdeaManageDialogs
        manage={manage}
        onClose={() => setManage(null)}
        onUpdated={onIdeaUpdated}
        onDeleted={(id) => {
          setDetailIdea(null);
          onIdeaDeleted(id);
        }}
      />
      {/* member profile viewer */}
      <MemberProfileDialog memberId={profileId} onClose={() => setProfileId(null)} />
    </section>
  );
}

/** tooltip helper for icon-only buttons (replaces native title for a styled hint) */
function Hint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function IdeaCard({
  idea,
  meId,
  busy,
  onJoin,
  onLeave,
  onViewProfile,
  onOpen,
  onManage,
  onToggleBookmark,
  savedOnly = false,
  folders = 0,
  onOpenFolders,
}: {
  idea: Idea;
  meId: string;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onViewProfile: (memberId: string) => void;
  onOpen: () => void;
  onManage: (mode: "edit" | "delete") => void;
  onToggleBookmark: () => void;
  savedOnly?: boolean;
  folders?: number;
  onOpenFolders?: () => void;
}) {
  const mine = idea.author.id === meId;
  const joined = idea.interests.some((i) => i.member.id === meId);
  const tags = splitList(idea.tags).slice(0, 6);
  const stack = idea.interests.slice(0, 5);
  const stackNames = idea.interests.map((i) => i.member.name).join(", ");
  const hot = idea.interests.length >= 3;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open details for ${idea.title}`}
      className="card-beam card-hover group flex h-full cursor-pointer flex-col rounded-xl border border-border/60 bg-card/60 p-5 focus-visible:outline-2 focus-visible:outline-primary/60"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StageBadge stage={idea.stage} />
          {hot ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 border border-gold/40 px-2 py-0.5 text-[10px] font-semibold text-gold">
              <Flame className="h-3 w-3 fill-current" aria-hidden />
              {idea.interests.length} members want in
            </span>
          ) : null}
        </div>
        <time className="text-xs text-muted-foreground" dateTime={idea.createdAt}>
          {formatDate(idea.createdAt)}
        </time>
      </div>

      <h3 className="font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
        {idea.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {idea.pitch}
        <span className="ml-1.5 inline-flex items-center align-baseline text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Read more →
        </span>
      </p>

      {idea.needs ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-primary">Looking for:</span>{" "}
            <span className="text-foreground/90">{idea.needs}</span>
          </span>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Chip key={t}>#{t}</Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-auto border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(idea.author.id);
            }}
            className="group/author flex min-w-0 items-center gap-2.5 text-left"
            aria-label={`View ${idea.author.name}'s profile`}
          >
            <Avatar name={idea.author.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium transition-colors group-hover/author:text-primary">
                {idea.author.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {idea.author.college}
                {idea.author.gradYear ? ` · ${idea.author.gradYear}` : ""}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            {(idea.commentCount ?? 0) > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/40 px-2 py-0.5 text-xs text-muted-foreground"
                title={`${idea.commentCount} comment${idea.commentCount === 1 ? "" : "s"} on this idea`}
                aria-label={`${idea.commentCount} comments`}
              >
                <MessageSquare className="h-3 w-3" aria-hidden />
                {idea.commentCount}
              </span>
            ) : null}
            <Hint label={idea.bookmarked ? "Remove from saved" : "Save for later"}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark();
                }}
                aria-label={idea.bookmarked ? `Remove ${idea.title} from saved` : `Save ${idea.title} for later`}
                aria-pressed={Boolean(idea.bookmarked)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 active:scale-90",
                  idea.bookmarked
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border/60 text-muted-foreground hover:border-gold/50 hover:text-gold"
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", idea.bookmarked && "fill-current")} aria-hidden />
              </button>
            </Hint>
            {savedOnly && onOpenFolders ? (
              <FolderButton count={folders} onClick={onOpenFolders} />
            ) : null}
            <Hint label="Copy shareable link">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyIdeaLink(idea.id, idea.title);
                }}
                aria-label={`Copy shareable link to ${idea.title}`}
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-90 sm:inline-flex"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Hint>
            {stack.length > 0 ? (
              <span
                className="flex items-center"
                title={`Interested: ${stackNames}`}
                aria-label={`${idea.interests.length} interested members`}
              >
                {stack.map((it, idx) => (
                  <Avatar
                    key={it.id}
                    name={it.member.name}
                    size="xs"
                    className={idx > 0 ? "-ml-2 ring-2 ring-background" : "ring-2 ring-background"}
                  />
                ))}
              </span>
            ) : null}

            {mine ? (
              <span className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="border-gold/40 bg-gold/10 text-gold"
                  title="You presented this venture"
                >
                  <Sparkles aria-hidden /> Your venture
                </Badge>
                <Hint label="Edit venture">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManage("edit");
                    }}
                    aria-label={`Edit ${idea.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-90"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </Hint>
                <Hint label="Delete venture">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManage("delete");
                    }}
                    aria-label={`Delete ${idea.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-destructive/60 hover:text-destructive active:scale-90"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </Hint>
              </span>
            ) : joined ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave();
                }}
                disabled={busy}
                aria-label="Step out of this venture"
              >
                <Flame className="fill-current text-primary" aria-hidden />
                You seconded this ({idea.interests.length})
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                disabled={busy}
                className="transition-transform active:scale-95"
              >
                <Flame aria-hidden /> I second this ({idea.interests.length})
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- loading skeleton ---------- */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-2.5 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

/* ---------- idea detail dialog ---------- */

function IdeaDetailDialog({
  idea,
  meId,
  busy,
  onClose,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onViewProfile,
  onCountChange,
  onToggleBookmark,
  savedOnly = false,
  folders = 0,
  onOpenFolders,
}: {
  idea: Idea | null;
  meId: string;
  busy: boolean;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewProfile: (memberId: string) => void;
  onCountChange: (ideaId: string, commentCount: number) => void;
  onToggleBookmark: () => void;
  savedOnly?: boolean;
  folders?: number;
  onOpenFolders?: () => void;
}) {
  const mine = idea ? idea.author.id === meId : false;
  const joined = idea ? idea.interests.some((i) => i.member.id === meId) : false;

  return (
    <Dialog open={idea !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        {idea ? (
          <IdeaDetailBody
            key={idea.id}
            idea={idea}
            meId={meId}
            mine={mine}
            joined={joined}
            busy={busy}
            onJoin={onJoin}
            onLeave={onLeave}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewProfile={onViewProfile}
            onCountChange={onCountChange}
            onToggleBookmark={onToggleBookmark}
            savedOnly={savedOnly}
            folders={folders}
            onOpenFolders={onOpenFolders}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* dialog body — isolated so comments state resets per idea (keyed above) */

function IdeaDetailBody({
  idea,
  meId,
  mine,
  joined,
  busy,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onViewProfile,
  onCountChange,
  onToggleBookmark,
  savedOnly = false,
  folders = 0,
  onOpenFolders,
}: {
  idea: Idea;
  meId: string;
  mine: boolean;
  joined: boolean;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewProfile: (memberId: string) => void;
  onCountChange: (ideaId: string, commentCount: number) => void;
  onToggleBookmark: () => void;
  savedOnly?: boolean;
  folders?: number;
  onOpenFolders?: () => void;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const threadRef = useRef<HTMLUListElement>(null);

  // load the thread once per opened idea
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void api<{ comments: CommentRow[] }>(`/ideas/${idea.id}/comments`)
      .then((r) => {
        setComments(r.comments);
        onCountChange(idea.id, r.comments.length);
      })
      .catch(() => setComments([]));
  }, [idea.id, onCountChange]);

  async function postComment() {
    const text = draft.trim();
    if (text.length < 2) {
      toast.error("Write a little more before posting");
      return;
    }
    setPosting(true);
    try {
      const res = await api<{ comment: CommentRow }>(`/ideas/${idea.id}/comments`, {
        body: { body: text },
      });
      setComments((prev) => [...(prev ?? []), res.comment]);
      setDraft("");
      onCountChange(idea.id, (comments ?? []).length + 1);
      toast.success("Comment posted to the discussion");
      // bring the fresh comment into view
      requestAnimationFrame(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function removeComment(commentId: string) {
    setDeletingId(commentId);
    try {
      await api(`/ideas/${idea.id}/comments?commentId=${commentId}`, { method: "DELETE" });
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
      onCountChange(idea.id, Math.max(0, (comments ?? []).length - 1));
      toast.success("Comment removed");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <StageBadge stage={idea.stage} />
          <time className="text-xs text-muted-foreground" dateTime={idea.createdAt}>
            {formatDate(idea.createdAt)}
          </time>
        </div>
        <DialogTitle className="font-display text-xl leading-snug">
          {idea.title}
        </DialogTitle>
        <DialogDescription className="sr-only">Full venture details</DialogDescription>
      </DialogHeader>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {idea.pitch}
      </p>

      {idea.needs ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-primary">Looking for:</span>{" "}
            <span className="text-foreground/90">{idea.needs}</span>
          </span>
        </div>
      ) : null}

      {splitList(idea.tags).length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {splitList(idea.tags).map((t) => (
            <Chip key={t}>#{t}</Chip>
          ))}
        </div>
      ) : null}

      {/* author card */}
      <button
        type="button"
        onClick={() => onViewProfile(idea.author.id)}
        aria-label={`View ${idea.author.name}'s profile`}
        className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-primary/40"
      >
        <Avatar name={idea.author.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{idea.author.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {idea.author.college}
            {idea.author.gradYear ? ` · ${idea.author.gradYear}` : ""}
            {idea.author.roles ? ` · ${idea.author.roles}` : ""}
          </p>
        </div>
        {splitList(idea.author.skills).slice(0, 3).map((s) => (
          <Chip key={s} className="hidden sm:inline-flex">
            {s}
          </Chip>
        ))}
      </button>

      {/* interested members */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {idea.interests.length === 0
            ? "No seconds yet — be the first"
            : `${idea.interests.length} member${idea.interests.length === 1 ? "" : "s"} want${idea.interests.length === 1 ? "s" : ""} in`}
        </p>
        {idea.interests.length > 0 ? (
          <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
            {idea.interests.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/30 px-3 py-2"
              >
                <Avatar name={it.member.name} size="xs" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {it.member.name}
                    {it.member.id === meId ? (
                      <span className="text-muted-foreground"> (you)</span>
                    ) : null}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {it.member.college}
                    </span>
                  </p>
                  {it.message ? (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">
                      &ldquo;{it.message}&rdquo;
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ---------- discussion ---------- */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Discussion
          {comments !== null ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {comments.length}
            </span>
          ) : null}
        </p>

        {/* thread */}
        {comments === null ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
            No comments yet — ask the founder a question or suggest an angle.
          </p>
        ) : (
          <ul
            ref={threadRef}
            className="max-h-56 space-y-2.5 overflow-y-auto pr-1 nice-scroll"
          >
            {comments.map((c) => {
              const own = c.member.id === meId;
              return (
                <li key={c.id} className="group/comment flex items-start gap-2.5">
                  <Avatar name={c.member.name} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1 rounded-lg bg-background/60 border border-border/40 px-3 py-2">
                    <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                      <span className="font-semibold">{c.member.name}</span>
                      {own ? <span className="text-muted-foreground">(you)</span> : null}
                      <span className="text-[10px] text-muted-foreground/70">
                        {c.member.college} · {timeAgo(c.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {c.body}
                    </p>
                  </div>
                  {own || mine ? (
                    <button
                      type="button"
                      onClick={() => void removeComment(c.id)}
                      disabled={deletingId === c.id}
                      aria-label={own ? "Delete your comment" : "Remove this comment (you are the idea author)"}
                      title={own ? "Delete comment" : "Remove comment (idea author)"}
                      className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/comment:text-muted-foreground/60"
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {/* composer */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 600))}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void postComment();
                }
              }}
              placeholder="Add to the discussion… (⌘/Ctrl + Enter to post)"
              aria-label="Write a comment"
              className="min-h-[52px] text-sm"
              rows={2}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground/60">
              {draft.length}/600
            </p>
          </div>
          <Button
            size="icon"
            onClick={() => void postComment()}
            disabled={posting || draft.trim().length < 2}
            aria-label="Post comment"
            className="mb-5 h-9 w-9 shrink-0"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <DialogFooter>
        {mine ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold px-3 py-1.5">
              <Sparkles aria-hidden /> Your venture
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleBookmark}
                className={cn(
                  "border-border",
                  idea.bookmarked && "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20"
                )}
                title={idea.bookmarked ? "Remove from saved" : "Save for later"}
              >
                <Bookmark className={cn("h-3.5 w-3.5", idea.bookmarked && "fill-current")} aria-hidden />
                {idea.bookmarked ? "Saved" : "Save"}
              </Button>
              {savedOnly && onOpenFolders ? (
                <FolderButton count={folders} onClick={onOpenFolders} variant="labeled" />
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyIdeaLink(idea.id, idea.title)}
                className="border-border"
                title="Copy shareable link"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden /> Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="border-border"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleBookmark}
                className={cn(
                  "text-muted-foreground",
                  idea.bookmarked && "text-gold hover:text-gold"
                )}
                title={idea.bookmarked ? "Remove from saved" : "Save for later"}
              >
                <Bookmark className={cn("h-3.5 w-3.5", idea.bookmarked && "fill-current")} aria-hidden />
                {idea.bookmarked ? "Saved" : "Save"}
              </Button>
              {savedOnly && onOpenFolders ? (
                <FolderButton count={folders} onClick={onOpenFolders} variant="labeled" />
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyIdeaLink(idea.id, idea.title)}
                className="text-muted-foreground"
                title="Copy shareable link"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden /> Copy link
              </Button>
            </div>
            {joined ? (
              <Button variant="secondary" onClick={onLeave} disabled={busy}>
                <Flame className="fill-current text-primary" aria-hidden />
                You seconded this ({idea.interests.length}) — step out
              </Button>
            ) : (
              <Button onClick={onJoin} disabled={busy} className="glow-emerald">
                <Flame aria-hidden /> I second this venture ({idea.interests.length})
              </Button>
            )}
          </div>
        )}
      </DialogFooter>
    </>
  );
}
