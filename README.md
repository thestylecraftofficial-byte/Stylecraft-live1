# StyleCraft

Personal styling reports. Form → on-device photo read → rule engine sets limits → Gemini drafts → rules check → report (web page + PDF) → outfit check.

## Try it on your laptop in 2 minutes (no Supabase)

```
npm install
copy .env.example .env.local        (Windows)   |   cp .env.example .env.local
```
Then put these lines in `.env.local`:
```
DEV_MEMORY_DB=true
ADMIN_PASSWORD=a-long-password
CRON_SECRET=any-random-text-24-characters
```
Run `npm run dev`, open http://localhost:3000/admin, sign in, tap **Create 24-hour link**, and open that link to fill the form.
Data lives in memory and disappears when the server restarts. `DEV_MEMORY_DB` is ignored in production.

## Checks

| Command | What it proves |
|---|---|
| `npm run typecheck` | the code type-checks |
| `npm test` | rules, report builder, PDF, report links, waitlist, outfit-photo cleaning, "no personal data in the anonymous store" |
| `./scripts/test-db.sh` | the migrations apply to real Postgres and the 7-day deletion removes every trace (set `PGHOST`, `PGPORT`, `PGUSER`) |

## Going live

See `docs/DEPLOY.md` (Supabase, Gemini, Gmail, Vercel) and `docs/PRIVACY-CHECKLIST.md` (what to settle before real customers).

## Rules to keep

- Never log request bodies, names, phone numbers or photos.
- The service role key stays on the server. Never put it in a `NEXT_PUBLIC_` variable.
- Change the wording in `lib/consent.ts` only together with `CONSENT_VERSION`.
- Change a rule in `lib/rules/engine.ts` only together with `RULES_VERSION` and a test.
