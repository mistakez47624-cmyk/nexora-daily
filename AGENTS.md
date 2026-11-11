<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- All app data lives in browser localStorage via `src/lib/store.ts` (useSyncExternalStore); components never touch localStorage for core data directly. Why: one persistence path keeps saving, import/export and cross-tab sync consistent.
- Backup import and stored data are validated with the zod schema in `src/lib/schema.ts`. Why: corrupted or foreign JSON must never crash the app.
- Pure business rules (overdue, sorting, streaks, completion rates, analytics) live in `src/lib/*.ts` and are covered by `src/test/rules.test.ts`. Why: logic stays testable apart from UI.
- Page content renders only after hydration (AppShell gate). Why: data comes from localStorage, so server HTML can't know it.
- Theme is a `dark` class on `<html>`, set by an inline head script before paint. Why: prevents a theme flash on load.
- Shared app components live in `src/components/nexora/`; shadcn primitives in `src/components/ui/` are styled via tokens in `src/styles.css`.
