"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  Clock,
  Flame,
  GraduationCap,
  Handshake,
  Lightbulb,
  Loader2,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/shared/Avatar";
import ConnectDialog from "@/components/platform/ConnectDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Chip, StageBadge, formatDate, splitList } from "./common";
import { cn } from "@/lib/utils";

type ProfileIdea = {
  id: string;
  title: string;
  pitch: string;
  stage: string;
  needs: string;
  tags: string;
  createdAt: string;
  interestCount: number;
  viewerInterested: boolean;
  commentCount?: number;
};

type ProfilePayload = {
  member: {
    id: string;
    name: string;
    college: string;
    gradYear: string;
    bio: string;
    skills: string;
    roles: string;
    availableFor: string;
    createdAt: string;
    ideaCount: number;
  };
  ideas: ProfileIdea[];
  connectionStatus: string | null;
  connectionId: string | null;
  isMe: boolean;
};

type Props = {
  memberId: string | null;
  onClose: () => void;
  /** notify the parent list so connect-state stays in sync */
  onConnected?: (memberId: string, status: "PENDING_OUT" | "ACCEPTED") => void;
};

/**
 * Rich member profile viewer — bio, skills, availability and the member's
 * public idea list, plus a contextual connect action.
 */
export default function MemberProfileDialog({ memberId, onClose, onConnected }: Props) {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  // the "Request introduction" button now opens the shared note dialog
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    api<ProfilePayload>(`/members/${memberId}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [memberId]);

  function connect() {
    if (!data) return;
    setConnectOpen(true);
  }

  async function applyConnectResult(result: { matched?: boolean; connectionId?: string }) {
    if (!data) return;
    const status = result.matched ? "ACCEPTED" : "PENDING_OUT";
    setData({
      ...data,
      connectionStatus: status,
      connectionId: result.connectionId ?? data.connectionId,
    });
    onConnected?.(data.member.id, status);
  }

  async function accept() {
    if (!data?.connectionId) return;
    setConnecting(true);
    try {
      await api(`/connections/${data.connectionId}`, {
        method: "PATCH",
        body: { status: "ACCEPTED" },
      });
      setData({ ...data, connectionStatus: "ACCEPTED" });
      onConnected?.(data.member.id, "ACCEPTED");
      toast.success("Introduced — you're now connected");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Dialog
      open={memberId !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        {/* always-present accessible title/description: the first render
            happens before the profile fetch resolves, when no header exists
            yet — this keeps Radix's a11y checks quiet in that window */}
        <DialogTitle className="sr-only">{data?.member.name ? `${data.member.name} — profile` : "Member profile"}</DialogTitle>
        <DialogDescription className="sr-only">
          Bio, skills and ventures for this member of the circle.
        </DialogDescription>

        {loading ? <ProfileSkeleton /> : null}

        {!loading && error ? (
          <DialogHeader>
            <DialogTitle className="font-display">Profile unavailable</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
        ) : null}

        {!loading && data ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4 pt-1">
                <Avatar name={data.member.name} size="xl" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-xl leading-tight">
                    {data.member.name}
                    {data.isMe ? (
                      <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    ) : null}
                  </DialogTitle>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-gold" aria-hidden />
                    {data.member.college}
                    {data.member.gradYear ? ` · ${data.member.gradYear}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {splitList(data.member.roles).slice(0, 4).map((r) => (
                      <Chip key={r} className="border-primary/25 bg-primary/10 text-primary">
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <DialogDescription className="sr-only">Member profile and ventures</DialogDescription>
            </DialogHeader>

            {data.member.bio ? (
              <p className="text-sm leading-relaxed text-foreground/90">{data.member.bio}</p>
            ) : null}

            {splitList(data.member.skills).length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {splitList(data.member.skills).map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {splitList(data.member.availableFor).length > 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="text-gold">Open to:</span>{" "}
                {splitList(data.member.availableFor).join(" · ")}
              </p>
            ) : null}

            {/* ideas */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5 text-gold" aria-hidden />
                {data.member.ideaCount === 0
                  ? "No ventures before the circle yet"
                  : `${data.member.ideaCount} venture${data.member.ideaCount === 1 ? "" : "s"} before the circle`}
              </p>
              {data.ideas.length > 0 ? (
                <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {data.ideas.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-xl border border-border/50 bg-card/30 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StageBadge stage={i.stage} />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(i.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 font-display text-sm font-bold leading-snug">{i.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {i.pitch}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {i.interestCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                            <Flame className="h-3 w-3" aria-hidden />
                            {i.interestCount} member{i.interestCount === 1 ? "" : "s"} want in
                          </span>
                        ) : null}
                        {i.viewerInterested ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold">
                            <Check className="h-3 w-3" aria-hidden /> you seconded this
                          </span>
                        ) : null}
                        {(i.commentCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MessageSquare className="h-3 w-3" aria-hidden />
                            {i.commentCount} comment{i.commentCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        {i.needs ? (
                          <span className="text-[11px] text-muted-foreground">
                            · looking for {i.needs}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* footer action */}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-emeraldx" aria-hidden />
                Member of the Conclave · admitted {formatDate(data.member.createdAt)}
              </p>
              {!data.isMe ? (
                data.connectionStatus === "ACCEPTED" ? (
                  <Button variant="outline" size="sm" disabled>
                    <Check className="text-emeraldx" aria-hidden /> Introduced
                  </Button>
                ) : data.connectionStatus === "PENDING_IN" ? (
                  <Button size="sm" onClick={() => void accept()} disabled={connecting}>
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Handshake aria-hidden />
                    )}
                    Accept introduction
                  </Button>
                ) : data.connectionStatus === "PENDING_OUT" ? (
                  <Button variant="secondary" size="sm" disabled>
                    <Clock aria-hidden /> Requested
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void connect()} disabled={connecting}>
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <UserPlus aria-hidden />
                    )}
                    Request introduction
                  </Button>
                )
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>

      {/* introduction request (with optional note) — stacks over the profile.
          member is null unless the user actually asked for it, otherwise the
          dialog would pop open the moment profile data arrives. */}
      <ConnectDialog
        member={connectOpen && data ? { id: data.member.id, name: data.member.name, college: data.member.college } : null}
        onClose={() => setConnectOpen(false)}
        onDone={applyConnectResult}
      />
    </Dialog>
  );
}

/* ---------- loading skeleton ---------- */

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 pt-1">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-48" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={cn("rounded-xl border border-border/50 p-3")}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading profile…</span>
    </div>
  );
}
