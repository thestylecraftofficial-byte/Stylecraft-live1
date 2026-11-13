# Rule review sheet for the stylist

Style is partly opinion, so every rule in the report is tagged:
- **sourced**: taken from a published guide (the source is printed in the report under "How this report was made").
- **adapted**: based on a source and changed for Indian wear or climate.
- **house**: a StyleCraft judgement with no published source. Review these first.

The rules live in `lib/rules/guide.ts` (patterns, clothing, fits, sizes, occasions), `lib/rules/engine.ts` (colour limits and checks) and `lib/rules/sources.ts` (the 13 sources, each with its link and the month it was checked).

## Please check
1. Women's size charts (bust and hip steps, blouse and kurti notes) are written generically and are marked **draft** in every report.
2. The wedding-guest colour rule: red, white and black are avoided for the wedding-guest occasion.
3. Men's shirt steps by chest (S up to 91 cm, M up to 99, L up to 107, XL up to 115, XXL up to 125) and trouser size from the waist in even inches.
4. Kurta sizes by chart (36 to 44 in) with ease added for fit.
5. Pattern mixing rules, and the "house rule" items in Patterns and Finishing touches.
6. The festival guidance (colours and meanings) for Diwali and Telugu occasions.

Mark each rule: keep, change (write the change) or remove. After the review, set `stylistReviewed` to true in `lib/report/build.ts` so the cover badge changes from "Stylist review pending".
