"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  Handshake,
  Inbox,
  Mail,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConnectionRow, ConnectionsPayload, DirectoryMember } from "./types";
import { Chip, SectionHeader, splitList } from "./common";

export default function Requests() {
  const [data, setData] = useState<ConnectionsPayload | null>(null);
  const [emailById, setEmailById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // emails are exposed by the directory endpoint; /connections omits them
      const [conns, dir] = await Promise.all([
        api<ConnectionsPayload>("/connections"),
        api<{ members: DirectoryMember[] }>("/members"),
      ]);
      setData(conns);
      const map: Record<string, string> = {};
      for (const m of dir.members) map[m.id] = m.email;
      setEmailById(map);
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, status: "ACCEPTED" | "DECLINED") {
    setBusyId(id);
    try {
      await api(`/connections/${id}`, { method: "PATCH", body: { status } });
      toast.success(status === "ACCEPTED" ? "Introduction accepted" : "Introduction declined");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function withdraw(id: string) {
    setBusyId(id);
    try {
      await api(`/connections/${id}`, { method: "DELETE" });
      toast.success("Request withdrawn");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function copyEmail(email: string) {
    if (!email) {
      toast.error("Email unavailable for this member");
      return;
    }
    if (!navigator.clipboard) {
      toast.error("Clipboard unavailable — copy it manually");
      return;
    }
    navigator.clipboard
      .writeText(email)
      .then(() => toast.success("Email copied to clipboard"))
      .catch(() => toast.error("Couldn't copy — please copy manually"));
  }

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const accepted = data?.accepted ?? [];

  return (
    <section aria-label="Introduction requests" className="space-y-6">
      <SectionHeader
        title="Introductions"
        subtitle={
          incoming.length > 0
            ? `The Chair notes ${incoming.length} introduction request${incoming.length === 1 ? "" : "s"} awaiting your reply`
            : "Curate the company you keep"
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-44" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error && !data ? (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">The introductions ledger couldn’t be opened.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-8 pb-4">
            {/* incoming */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Inbox className="h-4 w-4 text-primary" aria-hidden />
                Incoming
                <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {incoming.length}
                </span>
              </h3>
              {incoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  The Chair notes no pending introductions — all quiet.
                </p>
              ) : (
                <div className="space-y-3">
                  {incoming.map((c) => (
                    <RequestCard
                      key={c.id}
                      row={c}
                      busy={busyId === c.id}
                      onAccept={() => void respond(c.id, "ACCEPTED")}
                      onDecline={() => void respond(c.id, "DECLINED")}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* outgoing */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Clock className="h-4 w-4 text-gold" aria-hidden />
                Outgoing
                <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {outgoing.length}
                </span>
              </h3>
              {outgoing.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No introductions requested yet — browse the membership roll.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {outgoing.map((c) => (
                    <article
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4"
                    >
                      <Avatar name={c.other.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.other.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.other.college}
                          {c.other.gradYear ? ` · ${c.other.gradYear}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <Clock aria-hidden /> Requested
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => void withdraw(c.id)}
                        disabled={busyId === c.id}
                        aria-label={`Withdraw your introduction request to ${c.other.name}`}
                      >
                        Withdraw
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* accepted — your circle */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Handshake className="h-4 w-4 text-primary" aria-hidden />
                Your circle
                <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {accepted.length}
                </span>
              </h3>
              {accepted.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  Your circle is empty for now. Accept a request, or request one from the Members tab.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {accepted.map((c) => {
                    const skills = splitList(c.other.skills).slice(0, 4);
                    const email = emailById[c.other.id] ?? "";
                    return (
                      <article
                        key={c.id}
                        className="card-hover rounded-xl border border-border/60 bg-card/60 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={c.other.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.other.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.other.college}
                              {c.other.gradYear ? ` · ${c.other.gradYear}` : ""}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-emeraldx/50 text-emeraldx"
                          >
                            <Check aria-hidden /> Introduced
                          </Badge>
                        </div>
                        {skills.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {skills.map((s) => (
                              <Chip key={s}>{s}</Chip>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{email || "email hidden"}</span>
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            aria-label={`Copy ${c.other.name}'s email`}
                            onClick={() => copyEmail(email)}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- incoming request card ---------- */

function RequestCard({
  row,
  busy,
  onAccept,
  onDecline,
}: {
  row: ConnectionRow;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <article className="card-hover rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={row.other.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{row.other.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.other.college}
            {row.other.gradYear ? ` · ${row.other.gradYear}` : ""}
          </p>
          {row.message ? (
            <p className="mt-2 text-sm italic text-foreground/80">&ldquo;{row.message}&rdquo;</p>
          ) : null}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button size="sm" onClick={onAccept} disabled={busy}>
            <Check aria-hidden /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDecline}
            disabled={busy}
          >
            <X aria-hidden /> Decline
          </Button>
        </div>
      </div>
    </article>
  );
}
