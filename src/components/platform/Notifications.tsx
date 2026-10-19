"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Flame, Handshake, Inbox, Link2, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { firstName, timeAgo } from "./common";
import type { TabKey } from "./types";
import { cn } from "@/lib/utils";

type NotificationEvent = {
  id: string;
  kind: "interest" | "request" | "accepted" | "comment";
  createdAt: string;
  actor: { id: string; name: string; college: string };
  ideaTitle?: string;
  ideaId?: string;
  message?: string;
};

export default function Notifications({
  onNavigate,
}: {
  onNavigate: (tab: TabKey, ideaId?: string) => void;
}) {
  const [events, setEvents] = useState<NotificationEvent[] | null>(null);
  const [open, setOpen] = useState(false);
  // server-side read marker — null until the first /notifications load lands
  // (unknown ⇒ badge suppressed, so nothing flashes as unread)
  const [readTs, setReadTs] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api<{ events: NotificationEvent[]; readAt: string | null }>("/notifications")
      .then((r) => {
        setEvents(r.events);
        setReadTs(r.readAt ? new Date(r.readAt).getTime() || 0 : 0);
      })
      .catch(() => {
        /* notifications are non-critical — stay silent */
      });
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const unreadCount =
    readTs === null
      ? 0 // marker not synced yet — don't flash a false unread badge
      : (events ?? []).filter((e) => new Date(e.createdAt).getTime() > readTs).length;

  function markAllRead() {
    if (readTs === null) return; // nothing synced to mark against yet
    setReadTs(new Date().getTime()); // optimistic — clear the badge immediately
    // persist server-side so the marker follows the member across devices
    void api<{ readAt: string }>("/notifications", { method: "PATCH" }).catch(() => {
      /* non-fatal — the tray re-syncs on next load */
    });
  }

  function openAndMark() {
    setOpen(true);
    load();
  }

  function go(tab: TabKey, ideaId?: string) {
    markAllRead();
    setOpen(false);
    onNavigate(tab, ideaId);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) openAndMark();
        else setOpen(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Activity${unreadCount ? ` — ${unreadCount} unread` : ""}`}
          className={cn(
            "relative grid h-10 w-10 place-items-center rounded-full border transition-all",
            unreadCount
              ? "border-primary/40 bg-primary/10 text-primary animate-pulse-ring"
              : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:border-primary/30"
          )}
        >
          <Bell className="h-4 w-4" aria-hidden />
          <AnimatePresence>
            {unreadCount > 0 ? (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(92vw,380px)] rounded-xl border border-border/70 bg-popover/95 p-0 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="font-display text-sm font-bold tracking-tight">Activity</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark read
          </Button>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {events === null ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-card/50" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">
                All quiet in the house. Present a venture or request an introduction — activity shows up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {events.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (e.kind === "interest" || e.kind === "comment") {
                        go("feed", e.ideaId);
                      } else {
                        go("requests");
                      }
                    }}
                    title={
                      e.ideaId
                        ? `Open “${e.ideaTitle}”`
                        : e.kind === "accepted"
                          ? "View your circle"
                          : "Review this request"
                    }
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5",
                      new Date(e.createdAt).getTime() > readTs && "bg-primary/[0.06]"
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={e.actor.name} size="sm" />
                      <span
                        className={cn(
                          "absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-background",
                          e.kind === "interest" && "bg-gold text-gold-foreground",
                          e.kind === "request" && "bg-primary text-primary-foreground",
                          e.kind === "accepted" && "bg-emerald-500 text-white",
                          e.kind === "comment" && "bg-amber-400 text-amber-950"
                        )}
                        aria-hidden
                      >
                        {e.kind === "interest" ? (
                          <Flame className="h-2.5 w-2.5" />
                        ) : e.kind === "request" ? (
                          <Handshake className="h-2.5 w-2.5" />
                        ) : e.kind === "comment" ? (
                          <MessageSquare className="h-2.5 w-2.5" />
                        ) : (
                          <Link2 className="h-2.5 w-2.5" />
                        )}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">
                        <span className="font-medium">{firstName(e.actor.name)}</span>{" "}
                        {e.kind === "interest" && (
                          <>
                            seconds your venture{" "}
                            <span className="text-primary">&ldquo;{e.ideaTitle}&rdquo;</span>
                          </>
                        )}
                        {e.kind === "comment" && (
                          <>
                            weighed in on{" "}
                            <span className="text-primary">&ldquo;{e.ideaTitle}&rdquo;</span>
                          </>
                        )}
                        {e.kind === "request" && <>requests an introduction</>}
                        {e.kind === "accepted" && <>accepted your introduction</>}
                      </span>
                      {e.message ? (
                        <span className="mt-0.5 block truncate text-xs italic text-muted-foreground">
                          &ldquo;{e.message}&rdquo;
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-muted-foreground/70">
                        {e.actor.college} · {timeAgo(e.createdAt)}
                      </span>
                    </span>
                    {new Date(e.createdAt).getTime() > readTs ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={() => go("requests")}
            className="text-xs font-medium text-primary hover:underline"
          >
            Manage introductions →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
