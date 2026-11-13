# Privacy checklist before real customers

This is a working list to take to a lawyer, not legal advice.

## Where India's DPDP law stands (checked 30 Oct 2026, confirm with your lawyer)
The Digital Personal Data Protection Rules were notified on 13 November 2025. According to a law-firm summary
([Hogan Lovells](https://www.hlc.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-)),
the Data Protection Board provisions started at once, consent-manager rules start 13 November 2026, and most operational duties
(notice and consent, security safeguards, breach notification, retention and erasure, children's data, data-principal rights)
start on **13 May 2027**. Building to those standards now is cheaper than retrofitting later, and customers already expect it.

## What the product already does
- Separate identity and anonymous stores; the only bridge is a link row that is deleted 7 days after delivery.
- Plain-language consent, versioned and logged; optional keep-anonymous box kept separate.
- Face photo is read on the phone and never uploaded. Outfit photos are stored privately, seen by a person only, metadata stripped, deleted after 7 days.
- Only anonymous structured data goes to Gemini (a test checks that no name, phone, email or raw measurements are in the prompt).
- Admin pages are password-protected; report links are long random tokens and are not indexed by search engines.
- Logs never include request bodies or personal details.

## Still to do (owner: you, then lawyer)
1. **Privacy notice page** in plain English: what you collect, why, who processes it (Supabase, Vercel, Google), how long, how to ask for deletion. Link it from the form and footer.
2. **Contact for requests**: an email or WhatsApp number for access, correction and early-deletion requests, and a promise of reply time. Early deletion needs a manual step today: delete the link row, then the customer row.
3. **Age**: the form starts at 18-24. Add an explicit "I am 18 or older" box, because children's data needs parental consent under the Rules.
4. **Processors abroad**: Google (Gemini), Vercel and Supabase may handle data outside India. Ask your lawyer what the notice must say. Choose Mumbai regions where you can.
5. **Breach plan**: one page: who you tell, within what time, and how (Supabase key rotation, revoke tokens, notify customers).
6. **Photo of an outfit may show other people or a home.** The consent box already tells the customer a person will view it. Delete on request at any time.
7. **No payments**: the app takes no payments and holds no card or UPI details. Keep it that way.
8. **Feedback and keep-anonymous**: if the customer ticks keep-anonymous, body details and colours stay with no way back to them. Make sure the notice explains this plainly.
9. **Backups**: Supabase backups may hold deleted data for a while. Ask the lawyer how to word retention.
10. **Review the consent wording** (`lib/consent.ts`) with the lawyer, then bump `CONSENT_VERSION` for any change.
