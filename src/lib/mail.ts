import type { MailProviderId } from "./types";

export interface MailDraft {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface MailProvider {
  id: MailProviderId;
  name: string;
  blurb: string;
  /** Where the mailbox itself lives, so a connected account can be opened. */
  mailboxUrl: string;
  /**
   * `web` opens that service's compose page with the message filled in.
   * `app` opens the device mail app, because that service has no public compose link.
   */
  handoff: "web" | "app";
}

const URL_BODY_LIMIT = 1500;

const q = (value: string) => encodeURIComponent(value);

export function mailtoUrl(draft: MailDraft, body: string): string {
  return `mailto:${draft.to}?subject=${q(draft.subject)}&body=${q(body)}`;
}

function clipBody(body: string): { body: string; truncated: boolean } {
  if (body.length <= URL_BODY_LIMIT) return { body, truncated: false };
  return { body: `${body.slice(0, URL_BODY_LIMIT - 1)}…`, truncated: true };
}

/** Build the link that actually hands the message to a mail service. */
export function composeLink(
  providerId: MailProviderId,
  draft: MailDraft,
): { url: string; truncated: boolean } {
  const { body, truncated } = clipBody(draft.body);
  const provider = MAIL_PROVIDERS.find((item) => item.id === providerId);
  if (!provider || provider.handoff === "app") {
    return { url: mailtoUrl(draft, body), truncated };
  }

  const to = q(draft.to);
  const subject = q(draft.subject);
  const encodedBody = q(body);

  switch (providerId) {
    case "gmail":
      return {
        url: `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${to}&su=${subject}&body=${encodedBody}&authuser=${q(draft.from)}`,
        truncated,
      };
    case "outlook":
      return {
        url: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${encodedBody}`,
        truncated,
      };
    case "microsoft365":
      return {
        url: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${subject}&body=${encodedBody}`,
        truncated,
      };
    case "yahoo":
      return {
        url: `https://compose.mail.yahoo.com/?to=${to}&subject=${subject}&body=${encodedBody}`,
        truncated,
      };
    case "zoho":
      return {
        url: `https://mail.zoho.com/zm/comp.do?to=${to}&subject=${subject}&content=${encodedBody}`,
        truncated,
      };
    case "fastmail":
      return {
        url: `https://app.fastmail.com/mail/compose?to=${to}&subject=${subject}&body=${encodedBody}`,
        truncated,
      };
    case "yandex":
      return {
        url: `https://mail.yandex.com/compose?to=${to}&subject=${subject}&body=${encodedBody}`,
        truncated,
      };
    default:
      return { url: mailtoUrl(draft, body), truncated };
  }
}

export function mailProvider(id: MailProviderId): MailProvider {
  const found = MAIL_PROVIDERS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown mail provider: ${id}`);
  return found;
}

export const MAIL_PROVIDERS: MailProvider[] = [
  {
    id: "gmail",
    name: "Gmail",
    blurb: "Google accounts, including Google Workspace.",
    mailboxUrl: "https://mail.google.com/",
    handoff: "web",
  },
  {
    id: "outlook",
    name: "Outlook",
    blurb: "Outlook.com, Hotmail, and Live mail.",
    mailboxUrl: "https://outlook.live.com/mail/",
    handoff: "web",
  },
  {
    id: "microsoft365",
    name: "Microsoft 365",
    blurb: "Work and school mailboxes on Office 365.",
    mailboxUrl: "https://outlook.office.com/mail/",
    handoff: "web",
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    blurb: "Yahoo and Rocketmail addresses.",
    mailboxUrl: "https://mail.yahoo.com/",
    handoff: "web",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    blurb: "Apple iCloud. Sending opens your mail app.",
    mailboxUrl: "https://www.icloud.com/mail/",
    handoff: "app",
  },
  {
    id: "proton",
    name: "Proton Mail",
    blurb: "Proton accounts. Sending opens your mail app.",
    mailboxUrl: "https://mail.proton.me/",
    handoff: "app",
  },
  {
    id: "fastmail",
    name: "Fastmail",
    blurb: "Fastmail and custom domains hosted there.",
    mailboxUrl: "https://app.fastmail.com/",
    handoff: "web",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    blurb: "Zoho Mail personal and organization accounts.",
    mailboxUrl: "https://mail.zoho.com/",
    handoff: "web",
  },
  {
    id: "aol",
    name: "AOL Mail",
    blurb: "AOL addresses. Sending opens your mail app.",
    mailboxUrl: "https://mail.aol.com/",
    handoff: "app",
  },
  {
    id: "gmx",
    name: "GMX",
    blurb: "GMX mail. Sending opens your mail app.",
    mailboxUrl: "https://www.gmx.com/",
    handoff: "app",
  },
  {
    id: "yandex",
    name: "Yandex Mail",
    blurb: "Yandex and custom domains hosted there.",
    mailboxUrl: "https://mail.yandex.com/",
    handoff: "web",
  },
  {
    id: "tuta",
    name: "Tuta",
    blurb: "Tuta encrypted mail. Sending opens your mail app.",
    mailboxUrl: "https://app.tuta.com/",
    handoff: "app",
  },
  {
    id: "mailcom",
    name: "Mail.com",
    blurb: "Mail.com addresses. Sending opens your mail app.",
    mailboxUrl: "https://www.mail.com/",
    handoff: "app",
  },
  {
    id: "other",
    name: "Other mail app",
    blurb: "Any other address. Sending opens the mail app on this device.",
    mailboxUrl: "mailto:",
    handoff: "app",
  },
];
