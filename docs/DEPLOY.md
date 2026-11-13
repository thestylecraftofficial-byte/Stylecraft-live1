# Going live: step by step

Do these in order. Each step says how to check it worked.

## 1. Supabase (database and photo storage)
1. Create a project at supabase.com. Choose the **Mumbai (ap-south-1)** region so data stays in India.
2. SQL Editor: run the files in `supabase/migrations/` in order: `0001_init.sql`, `0002_photo_hint.sql` (empty note), `0002_report_fields.sql`, `0003_orders.sql`, `0004_outfit_checks.sql`, `0005_test_links.sql`, `0006_waitlist_stylists.sql`, `0007_waitlist_mail.sql`. (Or paste the single file `supabase/all-migrations.sql` once on a fresh project. Run it only once: running it a second time stops with "already exists", which is harmless.)
3. Project Settings → API → **Exposed schemas**: add `identity` and `anonymous`. Save.
4. Storage: confirm a **private** bucket `outfit-checks` exists (migration 0004 creates it; create it by hand if not).
5. Copy the project URL and the **service_role** key (never the anon key).
   Check: the tables `identity.customers` and `anonymous.profiles` exist and both show "RLS enabled".

## 2. Gemini
Create a key in Google AI Studio. Start on the free tier (the consent text already says Google may use content to improve products on it).
Move to the paid tier before you have many customers, then update the consent wording and `CONSENT_VERSION`.

## 3. Vercel
1. Push the folder to a private GitHub repo and import it in Vercel. Set the function region to **Mumbai (bom1)** if offered.
2. Environment variables (Production):
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (long random), `RETENTION_DAYS=7`,
   `GEMINI_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NEXT_PUBLIC_CONTACT`,
   `ADMIN_PASSWORD` (long), `NEXT_PUBLIC_SITE_URL` (your https address, no trailing slash).
   Optional: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` (leave unset; the app finds a working model by itself if one is retired), `GMAIL_DAILY_LIMIT`.
   **Do not set** `DEV_MEMORY_DB`.
   Paste the Gemini key **only here** in Vercel's environment variables, never in a chat or in the code.
3. Deploy. `vercel.json` already schedules the deletion job daily at 3:00 AM IST.
   Check: Vercel → Cron Jobs shows it; after a day, `anonymous.deletion_log` has a row.

## 3b. Sending reports to people
There is no payment and no public report page. The home page `/` is the waitlist. A report starts only from a link you make:
1. Open `https://YOUR-SITE/admin`. A sign-in page asks for the password you set as `ADMIN_PASSWORD`. You stay signed in for 12 hours, **Sign out** is at the top right, and five wrong tries lock that visitor out for 15 minutes. Changing `ADMIN_PASSWORD` signs everyone out.
2. Under **Report links**, type the person's name and an optional note, tap **Create 24-hour link**, copy the link and send it (for example on WhatsApp).
3. Each link works for 24 hours and gives **one report plus one redo** if they made a mistake. It asks for no name or phone number.
4. If Gemini is busy the person sees "Preparing your report" and the page retries by itself (up to 3 tries, with pauses so a busy or used-up Gemini quota is not hammered; then the rule-based report is used so nobody is left waiting).
5. At the end of every report the person gives an accuracy score (1 to 5), what felt wrong and what they liked.
6. **Report results** in `/admin` shows each person's answers, report and feedback side by side. **Download CSV** gives the same as a spreadsheet. **Outfit checks** shows photos waiting for your reply.
7. Names and answers are deleted `RETENTION_DAYS` (7) days after the link is used, so download the CSV before then.

## 3c. Let the app check your settings
Open `/admin`. The **Setup check** at the top lists every required setting with a tick or a cross and says what to add. It never shows the values. Fix every cross, redeploy, and reload until it says "all required settings are in place".

## 4. Deployment checklist (tick every line)

**Before you deploy (on your computer)**
- [ ] `npm run build` finishes with no errors, and `npx vitest run` shows every test passing.
- [ ] `.env.local` is not in the GitHub repo (it is in `.gitignore`). Never paste a key into a chat or a file you commit.
- [ ] The Supabase migrations in `supabase/all-migrations.sql` have been run in the Mumbai project (the waitlist and a test link work).

**In Vercel**
- [ ] Every variable from section 3 is set for **Production**, and `DEV_MEMORY_DB` is **not** set.
- [ ] `NEXT_PUBLIC_SITE_URL` is the final https address. This is used for the share preview image, `robots.txt` and the sitemap.
- [ ] Vercel → Cron Jobs lists two jobs: `/api/cron/deletion` and `/api/cron/waitlist-mail`.
- [ ] Redeploy after changing any variable (variables only apply to new deployments).

**Right after the first deploy (open each one)**
- [ ] `https://YOUR-SITE/` shows the waitlist page, and the Services section, menu links and Instagram links work.
- [ ] `https://YOUR-SITE/api/health` shows `{"ok":true,"db":true}`. If it shows `false`, the Supabase URL or service key is wrong.
- [ ] `https://YOUR-SITE/admin` asks for the password. Sign in, open the **Setup** tab and fix every cross.
- [ ] Join the waitlist with a second email address of yours. You should see the tick popup, get the thank-you email, and see the row in the **Waitlist** tab.
- [ ] Create a report link in `/admin`, open it on a phone, fill the form and read the finished report. Download the PDF. Give the feedback.
- [ ] Open the same link again after the redo is used: it must say the link has been used up.
- [ ] `https://YOUR-SITE/anything-wrong` shows the friendly "We could not find that page" page.
- [ ] `https://YOUR-SITE/robots.txt` and `/sitemap.xml` open and list your own address.
- [ ] Deletion job works: `curl -H "Authorization: Bearer <CRON_SECRET>" https://YOUR-SITE/api/cron/deletion` answers `{"ok":true,...}`.

**What people see when something goes wrong** (so you know what a message means)
| What they see | What it means | What you do |
|---|---|---|
| "This link has expired / been used up / is not valid" | The 24 hours passed, both attempts were used, or the link was mistyped | Make a new link in `/admin` |
| "We could not check your link" on the form | The database could not be reached | Check `/api/health` and Supabase |
| "Please check your answers (height)…" | A value on the form is out of range. Their attempt is not used | Ask them to correct it |
| "Preparing your report…" for more than a few minutes | Gemini is busy or out of quota; the app retries 3 times, then uses the rule-based report | Check Vercel logs for lines starting `gemini:` |
| "Something went wrong on our side" page | A page crashed. It shows a short code | Find that code in Vercel → Logs |
| PDF says it could not be made | The PDF drawing failed. The report page is fine | Check Vercel logs for `pdf failed` |
| Waitlist says "We are getting a lot of interest" | Too many sign-ups from one device or network in a short time | Nothing, it clears itself |

**Things to watch after launch**
- A free Supabase project is paused after about a week without activity (as far as I know). A busy waitlist keeps it awake; if it ever pauses, restore it from the Supabase dashboard.
- Vercel's free Hobby plan is meant for personal, non-commercial use. Once you take payments or affiliate income, check Vercel's terms and move to a paid plan if needed.
- Gemini's free tier has daily limits. See the Gemini section: moving to the paid tier costs only a few rupees per report.
- The sign-in lock-out and form rate limits live in each server's memory, so they reset when the server restarts. That is fine for a small launch.

## Running it day to day
- Each morning: open `/admin`, create links for people who messaged you, read new feedback, answer outfit checks.
- Monthly: read the feedback and improve the rules with your stylist.


## Waitlist and stylist applications
Both live in this app, so there is one deployment and one admin (`/admin`).
- **The home page `/` is your animated waitlist site** (files in `public/`: `waitlist.html`, `app.js`, `thanks.js`, `config.js`, `assets/`, `fonts/`, plus `privacy.html` and `terms.html`). It no longer needs Google Sheets or Apps Script: the form saves to Supabase through `/api/join`. The report starts at `/start?t=...` (pilot links) as before.
- Sign-ups appear under **Waitlist** in the admin (name, email, city, interests, where they came from, thank-you mail status), with a CSV download and a Delete button. One entry per email.
- **Thank-you email:** every new sign-up gets one email ("Thank you for showing interest in StyleCraft"), and a "Thank you" popup with a tick shows on the page. There is no confirm-your-email step. Setup: turn on 2-Step Verification on the Gmail account, create an **App Password** (Google Account, Security, App passwords), then add `GMAIL_USER` (the address) and `GMAIL_APP_PASSWORD` in Vercel.
  If Gmail's daily limit is reached (or Gmail is down), the email waits and is sent by the daily job (`/api/cron/waitlist-mail`, 4 AM UTC, protected by CRON_SECRET) the next day. The visitor is never told. `GMAIL_DAILY_LIMIT` (default 400) keeps you under Gmail's own cap.
- Stylists apply at `/stylists/apply` (not linked anywhere; share it only with people you invite). Applications appear under **Stylist applications**, where you can set New / Shortlisted / Contacted / Rejected, download a CSV or delete.
- Run the whole `supabase/all-migrations.sql` once on a new project (it includes 0006, 0007 and 0008).
- Differences from the old Google version: no visitor analytics or team dashboard (the admin shows the sign-ups instead), no confirm-your-email step, no launch-email sender yet (the CSV has everything you need to send one), and the privacy page was updated to say data is kept in Supabase.
- Your old Sheet entries are not moved. Paste them into the Supabase table editor, or ask for an import script.
- Spam: a hidden field, five sends per visitor per 30 minutes, one entry per email.
- These entries are NOT auto-deleted; delete them in the admin on request.

## Affiliate links (optional, after it works)
Links on the **web report** can earn a commission. The PDF always keeps plain search links, because Amazon (and most networks) do not allow affiliate links in PDFs or ebooks.
1. Join the programmes with your own accounts. Amazon Associates India, and a network such as Cuelinks for Myntra, Ajio and Flipkart. Rates, cookies and rules change, so read each programme's current terms.
2. Check each programme's rules about your site. The report pages are private (each is reachable only by its own link). Some programmes want a public site or only approve declared sites, so ask them before relying on it. Amazon also wants a few qualifying sales within its first 180 days.
3. In Vercel add `AMAZON_ASSOCIATE_TAG`, and for each network shop `AFFILIATE_<SHOP>_TEMPLATE` (the redirect link with `{url}` where the shop address goes). Redeploy.
4. The report then shows a disclosure line and marks the links as sponsored. Do not remove it: Indian advertising rules and Amazon's terms both require a clear disclosure.
5. Never change which items the rules recommend because of commission. That is what makes the report worth paying for.
