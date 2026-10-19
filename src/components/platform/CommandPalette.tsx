"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  Bookmark,
  CircleUserRound,
  Flame,
  Handshake,
  Lightbulb,
  LogOut,
  MessageSquare,
  Plus,
  Rss,
  Search,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/lib/api";
import type { DirectoryMember, Idea, TabKey } from "./types";
import { cn } from "@/lib/utils";

/**
 * ⌘K command palette — search ideas + founders, jump between tabs, quick actions.
 * Ideas come from the shared PlatformView state (no extra fetch); members are
 * lazily fetched the first time the palette opens and cached for the session.
 * Filtering is done locally (shouldFilter=false) so results can be capped and
 * ranked per group.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  ideas,
  meId,
  onNavigate,
  onOpenIdea,
  onOpenMember,
  onPostIdea,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideas: Idea[];
  meId: string;
  onNavigate: (tab: TabKey) => void;
  /** open an idea's detail dialog (Feed tab + focusIdeaId) */
  onOpenIdea: (ideaId: string) => void;
  /** open a member profile dialog directly from the palette */
  onOpenMember: (memberId: string) => void;
  onPostIdea: () => void;
  onLogout: () => void;
}) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const membersFetchedRef = useRef(false);

  // lazily load the member directory the first time the palette opens
  useEffect(() => {
    if (!open || membersFetchedRef.current) return;
    membersFetchedRef.current = true;
    api<{ members: DirectoryMember[] }>("/members")
      .then((r) => setMembers(r.members))
      .catch(() => {
        membersFetchedRef.current = false; // allow retry next open
      });
  }, [open]);

  // opening the palette always starts from a fresh query
  const setOpenState = useCallback(
    (o: boolean) => {
      if (o) setQuery("");
      onOpenChange(o);
    },
    [onOpenChange]
  );

  // global ⌘K / Ctrl+K toggle — suppressed while a modal dialog is open so
  // the palette never stacks on top of the post/detail/manager dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const dialogOpen =
          typeof document !== "undefined" && document.querySelector('[role="dialog"]');
        if (dialogOpen && !open) return;
        setOpenState(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpenState]);

  const q = query.trim().toLowerCase();

  const ideaHits = useMemo(() => {
    if (!q) return ideas.slice(0, 5);
    return ideas
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.pitch.toLowerCase().includes(q) ||
          i.tags.toLowerCase().includes(q) ||
          i.author.name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [ideas, q]);

  const memberHits = useMemo(() => {
    if (!q) return members.slice(0, 4);
    return members
      .filter((m) =>
        [m.name, m.college, m.skills, m.roles, m.bio].some((f) =>
          (f || "").toLowerCase().includes(q)
        )
      )
      .slice(0, 6);
  }, [members, q]);

  const noResults = q.length > 0 && ideaHits.length === 0 && memberHits.length === 0;

  const tabs: { key: TabKey; label: string; icon: typeof Rss }[] = [
    { key: "feed", label: "The Room", icon: Rss },
    { key: "saved", label: "Saved", icon: Bookmark },
    { key: "directory", label: "Members", icon: Users },
    { key: "myideas", label: "My ventures", icon: Lightbulb },
    { key: "requests", label: "Introductions", icon: Handshake },
    { key: "profile", label: "Profile", icon: CircleUserRound },
  ];

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={setOpenState}>
      <DialogContent
        showCloseButton={false}
        className="glass overflow-hidden border-border/70 p-0 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Conclave command palette</DialogTitle>
          <DialogDescription>Search ventures, members and actions</DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-item]_svg]:h-3.5 [&_[cmdk-item]_svg]:w-3.5"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search ventures, members, actions…"
            className="h-12"
          />
          <CommandList className="nice-scroll max-h-[min(58vh,430px)]">
            {noResults ? (
              <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center text-muted-foreground">
                <Search className="h-5 w-5 opacity-50" aria-hidden />
                <p className="text-sm font-medium">Nothing matches &ldquo;{query.trim()}&rdquo;</p>
                <p className="text-xs opacity-70">Try a member&apos;s name, a venture title or a tag.</p>
              </div>
            ) : null}

            {/* quick actions */}
            <CommandGroup heading="Actions">
              <CommandItem
                value="action-post-idea"
                onSelect={() => run(onPostIdea)}
                className="gap-3"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-sm font-medium">Present a new venture</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  House
                </span>
              </CommandItem>
            </CommandGroup>

            {/* ideas */}
            {ideaHits.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={q ? "Ventures — matching" : "Ventures — latest"}>
                  {ideaHits.map((idea) => {
                    const mine = idea.author.id === meId;
                    const hot = idea.interests.length >= 3;
                    return (
                      <CommandItem
                        key={idea.id}
                        value={`idea-${idea.id}`}
                        onSelect={() => run(() => onOpenIdea(idea.id))}
                        className="gap-3"
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-md border",
                            hot
                              ? "border-gold/40 bg-gold/10 text-gold"
                              : "border-primary/30 bg-primary/10 text-primary"
                          )}
                        >
                          {hot ? (
                            <Flame className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{idea.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {mine ? "Your venture" : idea.author.name} · {idea.stage}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                          {idea.interests.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Flame className="h-3 w-3 text-gold" aria-hidden />
                              {idea.interests.length}
                            </span>
                          ) : null}
                          {(idea.commentCount ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" aria-hidden />
                              {idea.commentCount}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            ) : null}

            {/* founders */}
            {memberHits.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={q ? "Members — matching" : "Members — newest"}>
                  {memberHits.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={`member-${m.id}`}
                      onSelect={() => run(() => onOpenMember(m.id))}
                      className="gap-3"
                    >
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-background"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.72 0.15 163), oklch(0.8 0.13 85))",
                        }}
                        aria-hidden
                      >
                        {m.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {m.college}
                          {m.skills
                            ? ` · ${m.skills
                                .split(",")
                                .slice(0, 3)
                                .map((s) => s.trim())
                                .join(", ")}`
                            : ""}
                        </span>
                      </span>
                      {m.ideaCount > 0 ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {m.ideaCount} venture{m.ideaCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {/* navigation */}
            <CommandSeparator />
            <CommandGroup heading="Go to">
              {tabs.map((t) => (
                <CommandItem
                  key={t.key}
                  value={`goto-${t.key}`}
                  onSelect={() => run(() => onNavigate(t.key))}
                  className="gap-3"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/60 text-muted-foreground">
                    <t.icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-sm">{t.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="action-sign-out"
                onSelect={() => run(onLogout)}
                className="gap-3 text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-destructive/30 text-destructive">
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-sm font-medium">Sign out</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
          {/* footer hints */}
          <div className="flex items-center justify-between border-t border-border/60 px-3.5 py-2 text-[10px] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <ArrowDownWideNarrow className="h-3 w-3" aria-hidden /> browse
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↵</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">esc</kbd> close
              </span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
