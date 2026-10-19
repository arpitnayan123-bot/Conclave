"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { IDEA_STAGES } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Idea } from "./types";

export type ManageMode = "edit" | "delete";
export type ManageState = { idea: Idea; mode: ManageMode } | null;

type Props = {
  manage: ManageState;
  onClose: () => void;
  onUpdated: (idea: Idea) => void;
  onDeleted: (ideaId: string) => void;
};

/**
 * Shared edit + delete dialogs for idea authors.
 * `manage` drives which dialog is open; closing resets to null.
 */
export default function IdeaManageDialogs({ manage, onClose, onUpdated, onDeleted }: Props) {
  const editing = manage?.mode === "edit" ? manage.idea : null;
  const deleting = manage?.mode === "delete" ? manage.idea : null;

  return (
    <>
      <EditIdeaDialog
        idea={editing}
        onClose={onClose}
        onSaved={(u) => {
          onClose();
          onUpdated(u);
        }}
      />
      <DeleteIdeaDialog
        idea={deleting}
        onClose={onClose}
        onDeleted={(id) => {
          onClose();
          onDeleted(id);
        }}
      />
    </>
  );
}

/* ---------- edit ---------- */

function EditIdeaDialog({
  idea,
  onClose,
  onSaved,
}: {
  idea: Idea | null;
  onClose: () => void;
  onSaved: (idea: Idea) => void;
}) {
  const [form, setForm] = useState({ title: "", pitch: "", stage: "IDEA", needs: "", tags: "" });
  const [saving, setSaving] = useState(false);

  // re-seed the form each time a new idea is opened for editing
  useEffect(() => {
    if (idea) {
      setForm({
        title: idea.title,
        pitch: idea.pitch,
        stage: idea.stage,
        needs: idea.needs ?? "",
        tags: idea.tags ?? "",
      });
    }
  }, [idea]);

  async function save() {
    if (!idea) return;
    if (form.title.trim().length < 4) {
      toast.error("Give your venture a clear title (at least 4 characters)");
      return;
    }
    if (form.pitch.trim().length < 40) {
      toast.error("Describe your venture in at least 40 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ idea: Idea }>(`/ideas/${idea.id}`, {
        method: "PATCH",
        body: form,
      });
      toast.success("Venture updated — the circle sees the latest version");
      onSaved(res.idea);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={idea !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">Refine your venture</DialogTitle>
          <DialogDescription>
            Sharpen the pitch or update the stage. Seconds stay attached.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-pitch">Pitch</Label>
            <Textarea
              id="edit-pitch"
              value={form.pitch}
              onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))}
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
              <Label htmlFor="edit-stage">Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}
              >
                <SelectTrigger id="edit-stage" className="w-full">
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
              <Label htmlFor="edit-needs">Looking for</Label>
              <Input
                id="edit-needs"
                value={form.needs}
                onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))}
                placeholder="e.g. Tech co-founder, ML"
                maxLength={120}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input
              id="edit-tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Comma separated — e.g. ai, logistics, hardware"
              maxLength={160}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- delete ---------- */

function DeleteIdeaDialog({
  idea,
  onClose,
  onDeleted,
}: {
  idea: Idea | null;
  onClose: () => void;
  onDeleted: (ideaId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function destroy() {
    if (!idea) return;
    setDeleting(true);
    try {
      await api(`/ideas/${idea.id}`, { method: "DELETE" });
      toast.success("Venture withdrawn from the room");
      onDeleted(idea.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={idea !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Withdraw this venture from the room?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{idea?.title}&rdquo; will be removed permanently, along with{" "}
            {idea?.interests.length === 1
              ? "1 second"
              : `${idea?.interests.length ?? 0} seconds`}{" "}
            recorded on it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void destroy();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Removing…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden /> Delete venture
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
