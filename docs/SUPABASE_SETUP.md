# Supabase setup for NEXORA

NEXORA's Supabase client integration uses the existing `public.nexora_user_data` table and its user-specific Row Level Security policies. The table and policies have already been created in the Supabase project. This repository does not define or change the database schema; do not add migrations or use a service-role/secret key in browser code.

## Existing database requirements

The table stores one `AppData` JSON document per user. `revision` supports compare-and-swap writes, and `legacy_migrated_at` records completion of local-data migration. The browser validates every document with the existing Zod schema. Keep RLS enabled and ensure authenticated users can only select, insert, update, and delete the row whose `user_id` matches `auth.uid()`. Do not grant anonymous access. Realtime publication for this table is needed for prompt cross-device updates; sessions still load the latest row when signing in.

## Supabase dashboard configuration

1. Confirm `nexora_user_data` and its four RLS policies are enabled. Do not recreate or alter the table for this deployment.
2. In Authentication, enable email/password sign-in. Set the Site URL to the production NEXORA origin and allow the production callback URLs `/auth/callback` and `/reset-password`. Add the matching local development URLs if you test authentication locally.
3. Set the email-confirmation and password-reset templates to use those redirect URLs.
4. Confirm `nexora_user_data` is included in the Realtime publication for cross-device updates.

## Vercel environment variables

In Vercel, add these variables to each environment where the app should use Supabase (Production, Preview, and Development as applicable):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the Supabase publishable key only. Do not place `.env.local`, service-role keys, or other secrets in Git or in any `VITE_*` variable. `.env.example` contains placeholders; set real values directly in Vercel's environment-variable settings. Redeploy after changing Vercel environment variables so the client bundle is rebuilt.

The production build uses Nitro's Vercel preset from `vite.config.ts`. Vercel should use the repository's `npm run build` command; no database migration or schema change is part of deployment.

## Local data behavior

The existing `nexora:data:v1` value is read-only during inspection and migration. A signed-in user is offered a validated merge, receives a download-backup option, and the local key is retained after verification. Existing cloud items are preserved. Duplicate IDs with differing values are imported under new IDs so both copies survive. An import marker is written with the cloud document only after the database returns the saved payload.

The `nexora:theme`, `nexora:accent`, `nexora:sidebar-open`, and `sidebar_state` preferences remain device-local.
