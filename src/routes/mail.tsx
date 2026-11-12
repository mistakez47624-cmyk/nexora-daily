import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/nexora/field-error";
import { PageHeader } from "@/components/nexora/page-header";
import { composeLink, MAIL_PROVIDERS, mailProvider, mailtoUrl } from "@/lib/mail";
import { mailConnectSchema, mailDraftSchema } from "@/lib/schema";
import { connectMailAccount, disconnectMailAccount, recordSentMail, useAppData } from "@/lib/store";
import type { MailProviderId } from "@/lib/types";

const searchSchema = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export const Route = createFileRoute("/mail")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Mail — NEXORA" },
      {
        name: "description",
        content: "Connect Gmail, Outlook, and other mail services, then send a message.",
      },
      { property: "og:title", content: "Mail — NEXORA" },
      {
        property: "og:description",
        content: "Connect Gmail, Outlook, and other mail services, then send a message.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MailPage,
});

function MailPage() {
  const data = useAppData();
  const search = Route.useSearch();
  const [connecting, setConnecting] = useState<MailProviderId | null>(null);
  const [fromId, setFromId] = useState<string>("");
  const [draft, setDraft] = useState({
    to: search.to ?? "",
    subject: search.subject ?? "",
    body: search.body ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<"to" | "subject" | "body", string>>>({});

  const accounts = data.mailAccounts;
  const selectedId = accounts.some((account) => account.id === fromId)
    ? fromId
    : (accounts[0]?.id ?? "");
  const selected = accounts.find((account) => account.id === selectedId) ?? null;

  const sent = useMemo(
    () =>
      [...data.sentMail].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).map((message) => ({
        ...message,
        account: accounts.find((account) => account.id === message.accountId) ?? null,
      })),
    [data.sentMail, accounts],
  );

  const openCompose = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) {
      toast.error("Connect a mailbox first");
      return;
    }
    const parsed = mailDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Partial<Record<"to" | "subject" | "body", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "to" || key === "subject" || key === "body") && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    const provider = mailProvider(selected.provider);
    const link = composeLink(provider.id, { from: selected.email, ...parsed.data });
    const saved = recordSentMail({ accountId: selected.id, ...parsed.data });
    if (!saved) return;
    openCompose(link.url);
    setDraft({ to: "", subject: "", body: "" });
    setErrors({});
    toast.success(
      provider.handoff === "web"
        ? `Opened in ${provider.name}. Confirm send there.`
        : "Opened in your mail app. Confirm send there.",
      link.truncated
        ? { description: "A long message was shortened in the mail window. The full copy is in Sent." }
        : undefined,
    );
  };

  const sendViaApp = () => {
    if (!selected) return;
    const parsed = mailDraftSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the message");
      return;
    }
    openCompose(mailtoUrl({ from: selected.email, ...parsed.data }, parsed.data.body));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mail"
        description="Connect a mailbox, write a message, and send it through that service. NEXORA stores the address only — never a password."
      />

      <section className="space-y-3" aria-labelledby="mail-services-heading">
        <div>
          <h2 id="mail-services-heading" className="text-sm font-semibold">
            Mail services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every option is listed here. Pick the one you actually use, including Gmail.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MAIL_PROVIDERS.map((provider) => {
            const connected = accounts.filter((account) => account.provider === provider.id);
            return (
              <Card key={provider.id} className="flex flex-col gap-3 bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                    {provider.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{provider.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{provider.blurb}</p>
                  </div>
                </div>
                {connected.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {connected.map((account) => (
                      <li key={account.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{account.email}</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => {
                            if (disconnectMailAccount(account.id)) {
                              toast.success(`${account.email} disconnected`);
                            }
                          }}
                        >
                          Disconnect
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" variant={connected.length > 0 ? "outline" : "default"} onClick={() => setConnecting(provider.id)}>
                    {connected.length > 0 ? "Connect another" : "Connect"}
                  </Button>
                  {provider.mailboxUrl.startsWith("http") && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={provider.mailboxUrl} target="_blank" rel="noreferrer">
                        Open <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="compose-heading">
        <Card className="bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
              <Mail className="size-4" />
            </span>
            <div>
              <h2 id="compose-heading" className="text-sm font-semibold">
                New message
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected
                  ? mailProvider(selected.provider).handoff === "web"
                    ? `Send opens ${mailProvider(selected.provider).name} with this message filled in. You confirm it there.`
                    : "Send opens the mail app on this device with this message filled in."
                  : "Connect a service above, then send from that address."}
              </p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No mailbox connected yet.
              {draft.subject ? " Your task message is filled in and waiting." : ""}
            </p>
          ) : (
            <form onSubmit={send} noValidate className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mail-from">From</Label>
                <Select value={selectedId} onValueChange={setFromId}>
                  <SelectTrigger id="mail-from" aria-label="Send from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {mailProvider(account.provider).name} · {account.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mail-to">To</Label>
                <Input
                  id="mail-to"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={draft.to}
                  aria-invalid={Boolean(errors.to)}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, to: event.target.value }));
                    if (errors.to) setErrors((current) => ({ ...current, to: undefined }));
                  }}
                />
                <FieldError id="mail-to-error" message={errors.to} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mail-subject">Subject</Label>
                <Input
                  id="mail-subject"
                  value={draft.subject}
                  maxLength={200}
                  aria-invalid={Boolean(errors.subject)}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, subject: event.target.value }));
                    if (errors.subject) setErrors((current) => ({ ...current, subject: undefined }));
                  }}
                />
                <FieldError id="mail-subject-error" message={errors.subject} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mail-body">Message</Label>
                <Textarea
                  id="mail-body"
                  rows={6}
                  value={draft.body}
                  maxLength={20000}
                  aria-invalid={Boolean(errors.body)}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, body: event.target.value }));
                    if (errors.body) setErrors((current) => ({ ...current, body: undefined }));
                  }}
                />
                <FieldError id="mail-body-error" message={errors.body} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <Send /> Send with {selected ? mailProvider(selected.provider).name : "mail"}
                </Button>
                <Button type="button" variant="outline" onClick={sendViaApp}>
                  Open in mail app
                </Button>
              </div>
            </form>
          )}
        </Card>
      </section>

      <section aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="text-sm font-semibold">
          Sent from NEXORA
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Copies of messages you handed off. Delivery happens in the mail service after you confirm.
        </p>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sent.map((message) => (
              <li key={message.id}>
                <Card className="bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{message.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    To {message.to}
                    {message.account
                      ? ` · ${mailProvider(message.account.provider).name} · ${message.account.email}`
                      : ""}
                  </p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {message.body}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConnectDialog
        providerId={connecting}
        onClose={() => setConnecting(null)}
        onConnected={(id) => setFromId(id)}
      />
    </div>
  );
}

function ConnectDialog({
  providerId,
  onClose,
  onConnected,
}: {
  providerId: MailProviderId | null;
  onClose: () => void;
  onConnected: (id: string) => void;
}) {
  return (
    <Dialog open={providerId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {providerId && (
          <ConnectForm key={providerId} providerId={providerId} onClose={onClose} onConnected={onConnected} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConnectForm({
  providerId,
  onClose,
  onConnected,
}: {
  providerId: MailProviderId;
  onClose: () => void;
  onConnected: (id: string) => void;
}) {
  const data = useAppData();
  const provider = mailProvider(providerId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = mailConnectSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    const normalized = parsed.data.email.toLowerCase();
    if (data.mailAccounts.some((account) => account.provider === providerId && account.email === normalized)) {
      setError("That mailbox is already connected");
      return;
    }
    const account = connectMailAccount(providerId, normalized);
    if (!account) return;
    toast.success(`${provider.name} connected`);
    onConnected(account.id);
    onClose();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Connect {provider.name}</DialogTitle>
        <DialogDescription>
          Enter the address you send from. NEXORA remembers it on this device and opens {provider.name} when you send. No password is stored.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="connect-email">Email address</Label>
        <Input
          id="connect-email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          value={email}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(undefined);
          }}
        />
        <FieldError id="connect-email-error" message={error} />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Connect</Button>
      </DialogFooter>
    </form>
  );
}
