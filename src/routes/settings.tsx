import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Download, Moon, Sun, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/nexora/confirm-dialog";
import { FieldError } from "@/components/nexora/field-error";
import { PageHeader } from "@/components/nexora/page-header";
import { nameSchema, parseAppData } from "@/lib/schema";
import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { clearAllData, exportData, replaceAllData, setProfileName, useAppData } from "@/lib/store";
import { ACCENTS, setAccent, setTheme, useAccent, useTheme } from "@/lib/theme";
import type { AppData, Theme } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NEXORA" },
      {
        name: "description",
        content: "Choose your theme, edit your name and back up or restore your data.",
      },
      { property: "og:title", content: "Settings — NEXORA" },
      {
        property: "og:description",
        content: "Choose your theme, edit your name and back up or restore your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const data = useAppData();
  const auth = useAuth();
  const theme = useTheme();
  const accent = useAccent();
  const [name, setName] = useState(data.profile.name);
  const [nameError, setNameError] = useState<string>();
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const nameDirty = name.trim() !== data.profile.name;

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message);
      return;
    }
    if (setProfileName(parsed.data)) {
      setName(parsed.data);
      toast.success("Display name saved");
    }
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("That file is too large", { description: "Backups must be under 10 MB." });
      return;
    }
    try {
      const parsed = parseAppData(JSON.parse(await file.text()));
      setPendingImport(parsed);
    } catch {
      toast.error("Couldn't import that file", {
        description: "Choose a JSON backup exported from NEXORA.",
      });
    }
  };

  const counts = [
    pluralize(data.tasks.length, "task"),
    pluralize(data.notes.length, "note"),
    pluralize(data.inbox.length, "inbox entry", "inbox entries"),
    pluralize(data.routines.length, "routine"),
    pluralize(data.mailAccounts.length, "mailbox", "mailboxes"),
  ].join(" · ");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Personalize NEXORA and manage your data." />

      <div className="space-y-6">
        <SettingsSection title="Profile" description="Shown in your greeting and the sidebar.">
          <form onSubmit={saveName} noValidate className="grid gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="display-name"
                value={name}
                maxLength={40}
                placeholder="Your name"
                autoComplete="name"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "display-name-error" : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(undefined);
                }}
                className="sm:max-w-xs"
              />
              <Button type="submit" disabled={!nameDirty}>
                Save
              </Button>
            </div>
            <FieldError id="display-name-error" message={nameError} />
          </form>
        </SettingsSection>

        <SettingsSection title="Appearance" description="Your choice is remembered on this device.">
          <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["dark", "Dark", Moon],
                ["light", "Light", Sun],
              ] as [Theme, string, typeof Moon][]
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => {
                  if (theme !== value) {
                    setTheme(value);
                    toast.success(`${label} theme on`);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors duration-150 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === value && "border-primary bg-selected hover:bg-selected",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground",
                    theme === value && "text-selected-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {value === "dark" ? "Easy on the eyes, the default" : "Bright and crisp"}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-4 rounded-full border border-muted-foreground/50",
                    theme === value && "border-[5px] border-primary",
                  )}
                />
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Accent colour"
          description="Choose the highlight colour used throughout NEXORA."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACCENTS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setAccent(item.value);
                  toast.success(`${item.label} accent applied`);
                }}
                aria-pressed={accent === item.value}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent/50",
                  accent === item.value && "border-primary bg-selected",
                )}
              >
                <span
                  className="size-6 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.label}</span>
                {accent === item.value && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Your data"
          description={`${supabaseConfigured && auth.status === "signed-in" ? "Synced to your account. A JSON backup can be exported at any time." : "Stored in this browser."} Currently: ${counts}.`}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={doExport}>
              <Download /> Export to JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import from JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFile}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Danger zone"
          description={`Permanently remove tasks, notes, inbox entries, routines, connected mailboxes, and your name${supabaseConfigured && auth.status === "signed-in" ? " from your account" : " from this browser"}.`}
        >
          <Button variant="destructive" onClick={() => setConfirmClear(true)}>
            <Trash2 /> Clear all data
          </Button>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        onOpenChange={(o) => !o && setPendingImport(null)}
        title="Replace your data with this backup?"
        description={
          pendingImport
            ? `The backup contains ${pluralize(pendingImport.tasks.length, "task")}, ${pluralize(pendingImport.notes.length, "note")}, ${pluralize(pendingImport.inbox.length, "inbox entry", "inbox entries")} and ${pluralize(pendingImport.routines.length, "routine")}. Everything currently in NEXORA will be replaced.`
            : ""
        }
        confirmLabel="Replace data"
        onConfirm={() => {
          if (pendingImport && replaceAllData(pendingImport)) {
            setName(pendingImport.profile.name);
            toast.success("Backup imported");
          }
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description={`This permanently deletes everything in NEXORA${supabaseConfigured && auth.status === "signed-in" ? " from your account" : " on this browser"}. Export a backup first if you might need it. This can't be undone.`}
        confirmLabel="Clear everything"
        onConfirm={() => {
          if (clearAllData()) {
            setName("");
            toast.success("All data cleared");
          }
        }}
      />
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
