import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  CheckSquare,
  Inbox as InboxIcon,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/nexora/confirm-dialog";
import { EmptyState } from "@/components/nexora/empty-state";
import { FieldError } from "@/components/nexora/field-error";
import { PageHeader } from "@/components/nexora/page-header";
import { CATEGORY_LABEL, QuickCapture } from "@/components/nexora/quick-capture";
import { captureSchema } from "@/lib/schema";
import {
  convertInboxToNote,
  convertInboxToTask,
  deleteInboxItem,
  setInboxProcessed,
  updateInboxItem,
  useAppData,
} from "@/lib/store";
import type { InboxCategory, InboxItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — NEXORA" },
      { name: "description", content: "Capture tasks, notes and ideas fast, then sort them when you're ready." },
      { property: "og:title", content: "Inbox — NEXORA" },
      { property: "og:description", content: "Capture tasks, notes and ideas fast, then sort them when you're ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

type View = "open" | "processed" | "all";
type CategoryFilter = "all" | InboxCategory;

function InboxPage() {
  const { inbox } = useAppData();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("open");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [editing, setEditing] = useState<InboxItem | null>(null);
  const [deleting, setDeleting] = useState<InboxItem | null>(null);

  const counts = useMemo(
    () => ({
      open: inbox.filter((i) => !i.processed).length,
      processed: inbox.filter((i) => i.processed).length,
      all: inbox.length,
    }),
    [inbox],
  );

  const visible = useMemo(
    () =>
      inbox
        .filter((i) => (view === "open" ? !i.processed : view === "processed" ? i.processed : true))
        .filter((i) => category === "all" || i.category === category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [inbox, view, category],
  );

  const toTask = (item: InboxItem) => {
    const task = convertInboxToTask(item.id);
    if (task) {
      toast.success("Converted to task", {
        action: { label: "Open tasks", onClick: () => navigate({ to: "/tasks" }) },
      });
    }
  };

  const toNote = (item: InboxItem) => {
    const note = convertInboxToNote(item.id);
    if (note) {
      toast.success("Converted to note", {
        action: { label: "Open note", onClick: () => navigate({ to: "/notes", search: { id: note.id } }) },
      });
    }
  };

  const toggleProcessed = (item: InboxItem) => {
    if (setInboxProcessed(item.id, !item.processed)) {
      toast.success(item.processed ? "Moved back to inbox" : "Marked as processed", {
        action: { label: "Undo", onClick: () => setInboxProcessed(item.id, item.processed) },
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Capture first, organize later. Convert entries into tasks or notes when you're ready."
      />

      <Card className="mb-6 p-4 sm:p-5">
        <QuickCapture autoFocus />
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Inbox view" className="flex w-fit gap-1 rounded-lg bg-secondary p-1">
          {(
            [
              ["open", "To process"],
              ["processed", "Processed"],
              ["all", "All"],
            ] as [View, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === value && "bg-card text-foreground shadow-card",
              )}
            >
              {label}
              <span className="text-xs tabular-nums text-muted-foreground">{counts[value]}</span>
            </button>
          ))}
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="idea">Ideas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={
            inbox.length === 0
              ? "Your inbox is empty"
              : view === "open" && category === "all"
                ? "Inbox zero — everything is processed"
                : "Nothing here"
          }
          description={
            inbox.length === 0
              ? "Use the box above to capture anything on your mind."
              : category !== "all"
                ? "No entries of this type in this view."
                : undefined
          }
          action={
            category !== "all" ? (
              <Button size="sm" variant="outline" onClick={() => setCategory("all")}>
                Show all types
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Card className={cn("flex items-start gap-3 p-4 transition-colors duration-150", item.processed && "bg-card/60")}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded border px-1.5 py-0.5 font-medium">{CATEGORY_LABEL[item.category]}</span>
                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    {item.processed && (
                      <span className="inline-flex items-center gap-1">
                        <Check className="size-3" /> Processed
                      </span>
                    )}
                  </div>
                  <p className={cn("whitespace-pre-wrap break-words text-sm", item.processed && "text-muted-foreground")}>
                    {item.content}
                  </p>
                  {!item.processed && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => toTask(item)}>
                        <CheckSquare /> To task
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toNote(item)}>
                        <StickyNote /> To note
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleProcessed(item)}>
                        <Check /> Mark processed
                      </Button>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Entry actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(item)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    {item.processed ? (
                      <DropdownMenuItem onSelect={() => toggleProcessed(item)}>
                        <RotateCcw /> Move back to inbox
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onSelect={() => toTask(item)}>
                          <CheckSquare /> Convert to task
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toNote(item)}>
                          <StickyNote /> Convert to note
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(item)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <EditInboxDialog item={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this entry?"
        description="This inbox entry will be permanently removed."
        onConfirm={() => {
          if (deleting && deleteInboxItem(deleting.id)) toast.success("Entry deleted");
        }}
      />
    </div>
  );
}

function EditInboxDialog({ item, onClose }: { item: InboxItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{item && <EditInboxForm key={item.id} item={item} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function EditInboxForm({ item, onClose }: { item: InboxItem; onClose: () => void }) {
  const [content, setContent] = useState(item.content);
  const [category, setCategory] = useState<InboxCategory>(item.category);
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = captureSchema.safeParse(content);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    if (updateInboxItem(item.id, { content: parsed.data, category })) {
      toast.success("Entry updated");
      onClose();
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Edit entry</DialogTitle>
        <DialogDescription>Refine the text or change its type.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="inbox-content">Content</Label>
        <Textarea
          id="inbox-content"
          value={content}
          rows={4}
          maxLength={1000}
          autoFocus
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setContent(e.target.value);
            if (error) setError(undefined);
          }}
        />
        <FieldError id="inbox-content-error" message={error} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="inbox-category">Type</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as InboxCategory)}>
          <SelectTrigger id="inbox-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="idea">Idea</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={content.trim().length === 0}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
