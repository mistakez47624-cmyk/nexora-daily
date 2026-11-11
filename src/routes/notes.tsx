import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Search,
  SearchX,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/nexora/confirm-dialog";
import { EmptyState } from "@/components/nexora/empty-state";
import { PageHeader } from "@/components/nexora/page-header";
import { addNote, deleteNote, exportData, updateNote, useAppData } from "@/lib/store";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/notes")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Notes — NEXORA" },
      {
        name: "description",
        content: "Write and organize notes with tags. Everything saves automatically.",
      },
      { property: "og:title", content: "Notes — NEXORA" },
      {
        property: "og:description",
        content: "Write and organize notes with tags. Everything saves automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

const MAX_TAGS = 10;

function isBlank(n: Note) {
  return n.title.trim() === "" && n.content.trim() === "" && n.tags.length === 0;
}

function NotesPage() {
  const { notes } = useAppData();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/notes" });
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  // Quietly discard notes left completely empty once you move away from them.
  useEffect(() => {
    exportData()
      .notes.filter((n) => n.id !== id && isBlank(n))
      .forEach((n) => deleteNote(n.id));
  }, [id]);

  const selected = notes.find((n) => n.id === id) ?? null;

  const allTags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].sort(), [notes]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => !tag || n.tags.includes(tag))
      .filter(
        (n) =>
          !term ||
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term) ||
          n.tags.some((t) => t.includes(term)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, search, tag]);

  const select = (noteId: string | undefined) => navigate({ search: { id: noteId } });

  const createNote = () => {
    const note = addNote({ tags: tag ? [tag] : [] });
    if (note) select(note.id);
  };

  if (notes.length === 0) {
    return (
      <div>
        <PageHeader title="Notes" description="Capture ideas and keep them organized with tags." />
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Write your first note. It saves automatically as you type."
          action={
            <Button onClick={createNote}>
              <Plus /> New note
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Capture ideas and keep them organized with tags."
        actions={
          <Button onClick={createNote}>
            <Plus /> New note
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* List */}
        <Card
          className={cn(
            "flex min-w-0 flex-col overflow-hidden md:h-[calc(100dvh-14rem)] md:min-h-[28rem]",
            selected && "hidden md:flex",
          )}
        >
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes"
                aria-label="Search notes"
                className="pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Filter by tag">
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tag === t}
                    onClick={() => setTag(tag === t ? null : t)}
                    className={cn(
                      "cursor-pointer rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      tag === t &&
                        "border-primary bg-selected text-selected-foreground hover:bg-selected hover:text-selected-foreground",
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="eyebrow px-4 pb-1 pt-3">Recently edited</p>
          <div className="flex-1 overflow-y-auto p-2 pt-0">
            {visible.length === 0 ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No matching notes"
                description="Try another search or tag."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setTag(null);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-0.5">
                {visible.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => select(n.id)}
                      aria-current={n.id === id ? "true" : undefined}
                      className={cn(
                        "block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        n.id === id && "bg-selected hover:bg-selected",
                      )}
                    >
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          n.id === id && "text-selected-foreground",
                        )}
                      >
                        {n.title || "Untitled note"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {n.content || "No content"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                        {n.tags.length > 0 && ` · ${n.tags.map((t) => `#${t}`).join(" ")}`}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Editor */}
        <Card
          className={cn(
            "min-w-0 overflow-hidden md:h-[calc(100dvh-14rem)] md:min-h-[28rem]",
            !selected && "hidden md:block",
          )}
        >
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              onBack={() => select(undefined)}
              onDelete={() => setDeleting(selected)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                compact
                icon={StickyNote}
                title="Select a note"
                description="Choose a note from the list or start a new one."
                action={
                  <Button size="sm" variant="outline" onClick={createNote}>
                    <Plus /> New note
                  </Button>
                }
              />
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this note?"
        description={`"${deleting?.title || "Untitled note"}" will be permanently removed.`}
        onConfirm={() => {
          if (deleting && deleteNote(deleting.id)) {
            toast.success("Note deleted");
            select(undefined);
          }
        }}
      />
    </div>
  );
}

type SaveState = "saved" | "saving";

function NoteEditor({
  note,
  onBack,
  onDelete,
}: {
  note: Note;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const pending = useRef<Partial<Pick<Note, "title" | "content" | "tags">>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    if (Object.keys(pending.current).length === 0) return;
    const patch = pending.current;
    pending.current = {};
    if (updateNote(note.id, patch)) setSaveState("saved");
  };

  const schedule = (patch: Partial<Pick<Note, "title" | "content" | "tags">>) => {
    pending.current = { ...pending.current, ...patch };
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  // Save anything pending when leaving the note or closing the tab.
  useEffect(() => {
    const onUnload = () => flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTag = () => {
    const value = tagInput.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 32);
    if (!value) return;
    if (tags.includes(value)) {
      setTagInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      toast.error(`A note can have up to ${MAX_TAGS} tags`);
      return;
    }
    const next = [...tags, value];
    setTags(next);
    setTagInput("");
    schedule({ tags: next });
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    schedule({ tags: next });
  };

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && tagInput === "") {
      const last = tags[tags.length - 1];
      if (last) removeTag(last);
    }
  };

  return (
    <div className="flex h-full min-h-[60dvh] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onBack}>
          <ArrowLeft /> Notes
        </Button>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground md:ml-2"
          aria-live="polite"
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check className="size-3" /> Saved
            </>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete note"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-8 sm:py-6">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule({ title: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          maxLength={200}
          placeholder="Untitled note"
          aria-label="Note title"
          autoFocus={note.title === "" && note.content === ""}
          className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-2xl"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs text-secondary-foreground"
            >
              #{t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove tag ${t}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {tags.length < MAX_TAGS && (
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={addTag}
              maxLength={33}
              placeholder={tags.length ? "Add tag" : "Add tags (press Enter)"}
              aria-label="Add tag"
              className="min-w-24 flex-1 bg-transparent py-0.5 text-xs outline-none placeholder:text-muted-foreground/70"
            />
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            schedule({ content: e.target.value });
          }}
          placeholder="Start writing…"
          aria-label="Note content"
          className="mt-5 min-h-64 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
