"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Lightbulb, MessageSquare, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Idea } from "./types";
import IdeaManageDialogs, { type ManageState } from "./IdeaManageDialogs";
import {
  Chip,
  EmptyState,
  SectionHeader,
  StageBadge,
  formatDate,
  splitList,
  staggerContainer,
  staggerItem,
} from "./common";

type MyIdeasProps = {
  ideas: Idea[];
  meId: string;
  loading: boolean;
  onPostIdea: () => void;
  /** plain "go to the feed" — no composer, used by browse-the-room links */
  onBrowseFeed: () => void;
  onIdeaUpdated: (idea: Idea) => void;
  onIdeaDeleted: (ideaId: string) => void;
};

export default function MyIdeas({
  ideas,
  meId,
  loading,
  onPostIdea,
  onBrowseFeed,
  onIdeaUpdated,
  onIdeaDeleted,
}: MyIdeasProps) {
  const [manage, setManage] = useState<ManageState>(null);
  const mine = ideas.filter((i) => i.author.id === meId);
  const joined = ideas.filter(
    (i) => i.author.id !== meId && i.interests.some((x) => x.member.id === meId)
  );

  return (
    <section aria-label="My ventures" className="space-y-8">
      <SectionHeader
        title="My Ventures"
        subtitle={
          mine.length > 0
            ? `${mine.length} venture${mine.length === 1 ? "" : "s"} — ${mine.reduce((n, i) => n + i.interests.length, 0)} member${mine.reduce((n, i) => n + i.interests.length, 0) === 1 ? "" : "s"} interested`
            : undefined
        }
        right={
          <Button onClick={onPostIdea}>
            <Plus aria-hidden /> Present a venture
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
              <Skeleton className="mt-5 h-3 w-32" />
              <Skeleton className="mt-3 h-10 w-full" />
            </div>
          ))}
        </div>
      ) : mine.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-6 w-6" aria-hidden />}
          title="Present your first venture to the circle"
          copy="Lay out what you're building and let the members weigh in. Rough sketches welcome."
          action={
            <Button onClick={onPostIdea}>
              <Plus aria-hidden /> Present a venture
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        >
          {mine.map((idea) => (
            <motion.div key={idea.id} variants={staggerItem} className="h-full">
              <MyIdeaCard
                idea={idea}
                onManage={(mode) => setManage({ idea, mode })}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* edit + delete dialogs for own ideas */}
      <IdeaManageDialogs
        manage={manage}
        onClose={() => setManage(null)}
        onUpdated={onIdeaUpdated}
        onDeleted={onIdeaDeleted}
      />

      {/* ideas I'm interested in */}
      {!loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-gold" aria-hidden />
            <h3 className="font-display text-lg font-bold">Ventures you&apos;ve seconded</h3>
            <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">
              {joined.length}
            </span>
          </div>

          {joined.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
              You haven&apos;t seconded a venture yet. Browse the{" "}
              <button
                type="button"
                onClick={onBrowseFeed}
                className="text-primary underline-offset-4 hover:underline"
              >
                room
              </button>{" "}
              to find one worth backing.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {joined.map((idea) => (
                <article
                  key={idea.id}
                  className="card-hover flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4"
                >
                  <Avatar name={idea.author.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{idea.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      by {idea.author.name} · {idea.author.college}
                    </p>
                  </div>
                  <StageBadge stage={idea.stage} />
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- rich card with full interest list ---------- */

function MyIdeaCard({ idea, onManage }: { idea: Idea; onManage: (mode: "edit" | "delete") => void }) {
  const tags = splitList(idea.tags);
  const n = idea.interests.length;

  return (
    <article className="card-hover flex h-full flex-col rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StageBadge stage={idea.stage} />
        <div className="flex items-center gap-2">
          <time className="text-xs text-muted-foreground" dateTime={idea.createdAt}>
            {formatDate(idea.createdAt)}
          </time>
          <button
            type="button"
            onClick={() => onManage("edit")}
            aria-label={`Edit ${idea.title}`}
            title="Edit venture"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onManage("delete")}
            aria-label={`Delete ${idea.title}`}
            title="Delete venture"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <h3 className="mt-3 font-display text-lg font-bold leading-snug">{idea.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{idea.pitch}</p>

      {idea.needs ? (
        <p className="mt-3 text-sm">
          <span className="font-medium text-primary">Looking for:</span>{" "}
          <span className="text-foreground/90">{idea.needs}</span>
        </p>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Chip key={t}>#{t}</Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold">
              {n > 0 ? (
                <>
                  {n} member{n === 1 ? "" : "s"} want{n === 1 ? "s" : ""} in
                </>
              ) : (
                <span className="font-normal text-muted-foreground">
                  No seconds yet — share it around the circle
                </span>
              )}
            </p>
          </div>
          {(idea.commentCount ?? 0) > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/40 px-2 py-0.5 text-xs text-muted-foreground"
              title={`${idea.commentCount} comment${idea.commentCount === 1 ? "" : "s"} in the discussion`}
            >
              <MessageSquare className="h-3 w-3" aria-hidden />
              {idea.commentCount} comment{idea.commentCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {n > 0 ? (
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {idea.interests.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40"
              >
                <Avatar name={it.member.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.member.college}</p>
                  {it.message ? (
                    <p className="mt-1 text-sm italic text-foreground/80">&ldquo;{it.message}&rdquo;</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
