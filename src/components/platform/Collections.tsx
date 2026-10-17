"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Folder, FolderPlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Idea } from "./types";

export type CollectionT = {
  id: string;
  name: string;
  ideaIds: string[];
};

/* ------------------------------------------------------------------ */
/* dialog: manage collections — toggle the idea's membership, create,  */
/* delete folders. With idea=null it works as a pure folder manager.   */
/* ------------------------------------------------------------------ */

export function CollectionsDialog({
  open,
  onOpenChange,
  idea,
  collections,
  onCollectionsChange,
  onBookmarked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
  collections: CollectionT[];
  onCollectionsChange: (next: CollectionT[]) => void;
  onBookmarked?: (ideaId: string, bookmarked: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null); // two-step delete
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const armedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // re-arm timer cleanup
  useEffect(() => {
    return () => {
      if (armedTimer.current) clearTimeout(armedTimer.current);
    };
  }, []);

  const reset = () => {
    setName("");
    setArmedId(null);
    setRenamingId(null);
    setRenameDraft("");
  };

  async function renameCollection(collection: CollectionT) {
    const trimmed = renameDraft.trim();
    if (trimmed.length < 2 || trimmed === collection.name) {
      setRenamingId(null);
      return;
    }
    setBusyId(collection.id);
    const prev = collections;
    // optimistic rename
    onCollectionsChange(
      collections.map((c) => (c.id === collection.id ? { ...c, name: trimmed } : c))
    );
    try {
      const res = await api<{ collection: { id: string; name: string } }>(
        `/collections/${collection.id}`,
        { method: "PATCH", body: { name: trimmed } }
      );
      onCollectionsChange(
        prev.map((c) => (c.id === collection.id ? { ...c, name: res.collection.name } : c))
      );
      toast.success(`Folder renamed to “${res.collection.name}”`);
      setRenamingId(null);
    } catch (err) {
      onCollectionsChange(prev); // roll back
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMembership(collection: CollectionT, checked: boolean) {
    if (!idea) return;
    const next = checked;
    // optimistic: flip membership locally
    onCollectionsChange(
      collections.map((c) =>
        c.id === collection.id
          ? {
              ...c,
              ideaIds: next
                ? [idea.id, ...c.ideaIds]
                : c.ideaIds.filter((id) => id !== idea.id),
            }
          : c
      )
    );
    setBusyId(collection.id);
    try {
      const res = await api<{ inCollection: boolean; bookmarked: boolean | null }>(
        `/collections/${collection.id}/items`,
        { body: { ideaId: idea.id, action: next ? "add" : "remove" } }
      );
      if (next && res.bookmarked) onBookmarked?.(idea.id, true);
      toast.success(
        next ? `Added to “${collection.name}”` : `Removed from “${collection.name}”`
      );
    } catch (err) {
      // roll back
      onCollectionsChange(
        collections.map((c) =>
          c.id === collection.id
            ? {
                ...c,
                ideaIds: next
                  ? c.ideaIds.filter((id) => id !== idea.id)
                  : [idea.id, ...c.ideaIds],
              }
            : c
        )
      );
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function createCollection() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the folder a name (at least 2 characters)");
      return;
    }
    setCreating(true);
    try {
      const res = await api<{ collection: CollectionT }>("/collections", {
        body: { name: trimmed },
      });
      onCollectionsChange([...collections, res.collection]);
      setName("");
      toast.success(`Folder “${res.collection.name}” created`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteCollection(collection: CollectionT) {
    if (armedId !== collection.id) {
      setArmedId(collection.id);
      if (armedTimer.current) clearTimeout(armedTimer.current);
      armedTimer.current = setTimeout(() => setArmedId(null), 2600);
      return;
    }
    if (armedTimer.current) clearTimeout(armedTimer.current);
    setBusyId(collection.id);
    try {
      await api(`/collections/${collection.id}`, { method: "DELETE" });
      onCollectionsChange(collections.filter((c) => c.id !== collection.id));
      setArmedId(null);
      toast.success(`Folder “${collection.name}” deleted`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Folder className="h-5 w-5 text-gold" aria-hidden />
            {idea ? "Add to a collection" : "Your collections"}
          </DialogTitle>
          <DialogDescription>
            {idea
              ? "Folders group your saved ideas — compare co-founder fits, track due-diligence, keep shortlists."
              : "Create folders to organize your saved ideas."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto nice-scroll space-y-1.5 pr-1">
          {collections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No folders yet — create your first one below.
            </p>
          ) : (
            collections.map((c) => {
              const checked = idea ? c.ideaIds.includes(idea.id) : false;
              const armed = armedId === c.id;
              const renaming = renamingId === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    checked ? "border-gold/40 bg-gold/5" : "border-border/60"
                  )}
                >
                  {idea ? (
                    <Checkbox
                      checked={checked}
                      disabled={busyId === c.id}
                      onCheckedChange={(v) => void toggleMembership(c, v === true)}
                      aria-label={checked ? `Remove from ${c.name}` : `Add to ${c.name}`}
                      className="h-5 w-5 rounded-md data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-background"
                    />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  )}
                  {renaming ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void renameCollection(c);
                      }}
                    >
                      <Input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        maxLength={40}
                        aria-label={`Rename ${c.name}`}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.id || renameDraft.trim().length < 2}
                        className="h-8 shrink-0 px-2.5 text-xs"
                      >
                        {busyId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Save
                      </Button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        aria-label="Cancel rename"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.ideaIds.length} saved
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(c.id);
                          setRenameDraft(c.name);
                          setArmedId(null);
                        }}
                        disabled={busyId === c.id}
                        aria-label={`Rename ${c.name}`}
                        title="Rename folder"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCollection(c)}
                        disabled={busyId === c.id}
                        aria-label={armed ? `Confirm delete ${c.name}` : `Delete ${c.name}`}
                        title={armed ? "Click again to confirm" : "Delete folder"}
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                          armed
                            ? "border-destructive/60 bg-destructive/15 text-destructive"
                            : "border-transparent text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                        )}
                      >
                        {busyId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void createCollection();
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New folder name — e.g. Strong tech fits"
              maxLength={40}
              aria-label="New collection name"
            />
            <Button type="submit" size="sm" disabled={creating || name.trim().length < 2}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Create
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* rail: horizontal folder chips + "New folder" chip (Saved tab)       */
/* ------------------------------------------------------------------ */

export function CollectionsRail({
  collections,
  activeId,
  bookmarkedCount,
  onSelect,
  onManage,
}: {
  collections: CollectionT[];
  activeId: string; // "ALL" or collection id
  bookmarkedCount: number;
  onSelect: (id: string) => void;
  onManage: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Collections"
    >
      <button
        type="button"
        onClick={() => onSelect("ALL")}
        aria-pressed={activeId === "ALL"}
        className={cn(
          "inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
          activeId === "ALL"
            ? "border-primary/50 bg-primary/15 text-primary"
            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
        )}
      >
        <BookmarkDoodle aria-hidden />
        All saved
        <span className="text-[10px] opacity-70">{bookmarkedCount}</span>
      </button>

      {collections.map((c) => {
        const active = activeId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
              active
                ? "border-gold/60 bg-gold/10 text-gold shadow-[0_0_18px_-6px_oklch(0.83_0.13_85/45%)]"
                : "border-border/60 text-muted-foreground hover:border-gold/40 hover:text-gold"
            )}
          >
            <Folder className={cn("h-3.5 w-3.5", c.ideaIds.length > 0 && "fill-current opacity-60")} aria-hidden />
            <span className="max-w-[140px] truncate">{c.name}</span>
            <span className="text-[10px] opacity-70">{c.ideaIds.length}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onManage}
        className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-full border border-dashed border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        aria-label="Create or manage collections"
      >
        <FolderPlus className="h-3.5 w-3.5" aria-hidden />
        New folder
      </button>
    </div>
  );
}

function BookmarkDoodle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

/** open-folder doodle for empty states */
export function FolderOpenDoodle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* folder button shown on cards / dialog footer (Saved contexts)       */
/* ------------------------------------------------------------------ */

export function FolderButton({
  count,
  onClick,
  variant = "icon",
}: {
  count: number;
  onClick: () => void;
  variant?: "icon" | "labeled";
}) {
  if (variant === "labeled") {
    return (
      <Button variant="outline" size="sm" onClick={onClick} className="border-border" title="Organize into collections">
        <Folder className={cn("h-3.5 w-3.5", count > 0 && "fill-current text-gold")} aria-hidden />
        Folders{count > 0 ? ` (${count})` : ""}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Organize into collections"
      title="Organize into collections"
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        count > 0
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-border/60 text-muted-foreground hover:border-gold/50 hover:text-gold"
      )}
    >
      <Folder className={cn("h-3.5 w-3.5", count > 0 && "fill-current opacity-70")} aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-0.5 text-[9px] font-bold text-background">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** how many collections contain this idea */
export function folderCount(collections: CollectionT[], ideaId: string): number {
  return collections.reduce((n, c) => n + (c.ideaIds.includes(ideaId) ? 1 : 0), 0);
}
