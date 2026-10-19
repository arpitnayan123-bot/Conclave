"use client";

import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type ConnectTarget = { id: string; name: string; college?: string } | null;
export type ConnectResult = { matched?: boolean; connectionId?: string };

/**
 * Confirmation step for requesting an introduction — shared by the directory
 * cards and the profile viewer. Carries an optional one-line note that the
 * other member sees in their requests tray (POST /api/connections {message}).
 */
export default function ConnectDialog({
  member,
  onClose,
  onDone,
}: {
  member: ConnectTarget;
  onClose: () => void;
  onDone: (result: ConnectResult) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // fresh note per target
  useEffect(() => {
    if (member) setNote("");
  }, [member?.id]);

  async function confirm() {
    if (!member || busy) return;
    setBusy(true);
    try {
      const res = await api<{ matched?: boolean; connection?: { id: string } }>("/connections", {
        body: { addresseeId: member.id, message: note.trim() },
      });
      toast.success(
        res.matched ? "Introduced — you're now connected" : "Introduction requested"
      );
      onDone({ matched: res.matched, connectionId: res.connection?.id });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">Request an introduction</DialogTitle>
          <DialogDescription>
            {member ? (
              <>
                Add a note for <span className="font-medium text-foreground">{member.name}</span>
                {member.college ? ` (${member.college})` : ""} — it rides along with your
                request and shows in their tray.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="space-y-2"
        >
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="e.g. Building something adjacent — would love to trade notes"
            aria-label="One-line note (optional)"
          />
          <p className="text-right text-[11px] text-muted-foreground/70">{note.length}/140</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Handshake aria-hidden /> Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
