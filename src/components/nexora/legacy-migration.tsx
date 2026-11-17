import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
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
import { inspectLegacyData, migrateLegacyData, usePersistenceState } from "@/lib/store";
import { pluralize } from "@/lib/utils";

function downloadRaw(raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexora-local-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function LegacyMigrationPrompt() {
  const persistence = usePersistenceState();
  const inspection = useMemo(() => inspectLegacyData(), []);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const eligible = inspection.data !== null && !persistence.legacyMigrated;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (eligible && persistence.phase === "synced" && !dismissed) setOpen(true);
  }, [dismissed, eligible, persistence.phase]);

  if (inspection.error && inspection.raw) {
    return (
      <Card className="mb-5 border-warning/30 bg-warning/10 p-4">
        <p className="text-sm font-medium">We found older browser data that needs review.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          NEXORA couldn’t validate it, so it has not been changed or uploaded. Download a copy
          before reviewing the file.
        </p>
        <Button
          className="mt-3"
          size="sm"
          variant="outline"
          onClick={() => downloadRaw(inspection.raw!)}
        >
          <Download /> Download original data
        </Button>
      </Card>
    );
  }
  if (!eligible || dismissed || persistence.phase !== "synced") return null;

  const data = inspection.data!;
  const summary = [
    pluralize(data.tasks.length, "task"),
    pluralize(data.notes.length, "note"),
    pluralize(data.inbox.length, "inbox entry", "inbox entries"),
    pluralize(data.routines.length, "routine"),
    pluralize(data.mailAccounts.length, "mailbox", "mailboxes"),
    pluralize(data.sentMail.length, "mail handoff", "mail handoffs"),
  ].join(" · ");

  const migrate = async () => {
    setBusy(true);
    const success = await migrateLegacyData();
    setBusy(false);
    if (success) {
      setOpen(false);
      toast.success("Your browser data is now in your account");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDismissed(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bring your NEXORA data into this account?</DialogTitle>
          <DialogDescription>
            We found {summary} in this browser. NEXORA will keep the original browser copy and make
            a backup-ready recovery copy until the cloud save is verified.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {persistence.hasCloudRecord
            ? "Your account already has cloud data. We’ll merge the browser items into it, keep existing cloud items, and preserve conflicting items as separate copies."
            : "Your account has no cloud data yet. We’ll copy these items into your account and verify the saved version before marking migration complete."}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => downloadRaw(inspection.raw!)}
          >
            <Download /> Download backup
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setDismissed(true);
            }}
          >
            Not now
          </Button>
          <Button type="button" disabled={busy} onClick={() => void migrate()}>
            {busy ? "Saving and verifying…" : "Merge and sync"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
