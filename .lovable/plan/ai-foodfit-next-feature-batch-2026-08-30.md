# AI FoodFit — Next Feature Batch

Estimated effort: all five features can be built in **1 working day** (roughly 4-6 hours of implementation across a few messages), since everything stays in the existing local-storage prototype with no backend needed.

| Feature | Effort |
| --- | --- |
| Hydration streaks | ~30 min |
| Smart alerts | ~1 hr |
| Food alternatives (surfaced everywhere) | ~45 min |
| Export weekly nutrition report | ~1 hr |
| Editable food history | ~1.5 hr |

## 1. Hydration streaks
Replace the current "Done today / Keep sipping" badge with a real streak: count consecutive days where `waterMl >= waterL * 1000`. Show it on Home next to the eating streak and in Progress stats, with a small 7-day dot row (filled = goal met).

## 2. Smart alerts
A dismissible alerts panel on Home, generated from today's log and targets:
- Protein far behind at midday / evening
- Water below pace for the time of day
- Calories over target, or well under with no dinner logged
- Sodium or sugar high for the day
- No meal logged in a slot that has passed
Each alert has an emoji, short bilingual text (English/Tamil per profile language) and a tap action that jumps to the analyzer or water control. Dismissals are remembered for the day.

## 3. Show food alternatives
Alternatives already exist in the food data; surface them in more places:
- Meal planner: each suggested item gets a "swap" option showing cheaper or healthier alternatives with kcal/₹ difference
- Progress timeline entries: "better option next time" hint for items scored Limit/High
- Nutrition result: keep existing list, add why-it-is-better one-liners

## 4. Export weekly nutrition report
A "Download weekly report" button in Progress and Profile that builds the last 7 days summary (daily kcal, macros, fiber, water, meals logged, weight change, average health score) and offers:
- CSV download for spreadsheets
- Print-friendly report view (browser print/PDF) with the estimate disclaimer included

## 5. Editable food history
Progress gets a day picker (last 30 days) so any past day can be opened. On any day you can:
- Edit quantity of a logged item (recomputes nutrition)
- Change its meal slot
- Delete an item, or add a food to that past day
- Adjust that day's water total
All weekly charts and streaks recalculate from the edits.

## Technical notes
- Store: add `updateEntry`, `addEntryOn(date, ...)`, `setWater(date, ml)`, and a `hydrationStreak` selector; keep the existing localStorage shape with a version bump and safe migration.
- Alerts live in a new `src/lib/foodfit/alerts.ts` pure function (log + targets + time of day → alert list); dismissals kept per date in the store.
- Report generation in `src/lib/foodfit/report.ts` (CSV string builder + data aggregation), triggered client-side via Blob download; print view rendered in a dialog.
- New UI pieces reuse `card-soft`, existing rings/bars, and semantic tokens — no hardcoded colors.
- Estimate/disclaimer wording stays on every new surface.
