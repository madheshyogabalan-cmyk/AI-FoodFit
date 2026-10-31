# AI FoodFit — AI-Powered Personal Nutrition & Diet Assistant

AI FoodFit is a bilingual (English / Tamil) web and mobile web application that helps
students and families build healthier eating habits. It estimates daily calorie and
macronutrient targets, analyses any food the user logs, evaluates it on a five-band
health scale, suggests healthier Indian-food alternatives, generates goal-aware and
budget-aware meal plans, and tracks weight, hydration and streaks over time.

- **Live app:** https://ai-foodfit-maddyy.lovable.app
- **Repository:** https://github.com/madheshyogabalan-cmyk/AI-FoodFit
- **Author:** Y. Madhesh, AIML B, Rathinam Technical Campus (RTC)

> All nutritional values, health scores and meal plans are estimates for wellness
> education only. They are not medical or clinical prescriptions.

## Features

| Module | Route | What it does |
| --- | --- | --- |
| Onboarding | `/welcome` | Collects age, sex, height, weight, activity level, food preference, goal and language |
| Home Dashboard | `/` | Progress bars for calories, protein/carbs/fat, fiber and water; daily goal; one-tap Add Food |
| Food Analyzer | `/analyze` | Search by name or quantity, quick-add Indian foods, nutrition result with 0–100 health score, pros/cons and healthier swaps |
| Meal Planner | `/meals` | Goal-aware breakfast/lunch/snack/dinner suggestions with per-item cost and total, plus Budget Diet Mode from a daily rupee budget |
| Progress Tracking | `/progress` | Daily food timeline, weekly weight/calorie/protein charts, hydration streaks, editable history, weekly CSV/print report |
| AI Assistant | `/chat` | "FoodFit AI" chatbot answering nutrition questions in English and Tamil/Tanglish |
| Profile | `/profile` | Edit profile, language, sign out, reset data |

## Tech stack

- **Frontend:** React 19 + TypeScript, TanStack Start (SSR-ready) + TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/radix-ui components, Recharts
- **Backend (Lovable Cloud / Postgres):** managed authentication (email + Google) and a Postgres database accessed through the auto-generated, type-safe client; all user data is protected with row-level security
- **Tooling:** Vite 8, ESLint + Prettier, strict TypeScript

## Architecture

```
┌────────────────────────────────────────────────────┐
│ Presentation layer — route pages + UI components   │
├─────────────────────────────────────────────────────────┤
│ Domain/logic layer — pure TypeScript modules:      │
│   nutrition.ts (targets, scaling), foods.ts DB,    │
│   ai.ts (assistant), alerts.ts, report.ts, i18n.ts │
├──────────────────────────────────────────────────────────┤
│ Persistence layer — typed Supabase client + RLS    │
│   store.tsx keeps optimistic local state, then     │
│   writes each change to Postgres per user          │
└────────────────────────────────────────────────────────┘
```

## Database schema

All tables live in the `public` schema and store the owner as `user_id uuid`.
Row-level security is **enabled on every table**; policies allow SELECT/INSERT/
UPDATE/DELETE only when `auth.uid() = user_id`, so no user can read or modify
another user's data.

| Table | Columns | Purpose |
| --- | --- | --- |
| `profiles` | `user_id` (PK), `name`, `age`, `sex`, `height_cm`, `weight_kg`, `activity`, `pref`, `goal`, `target_weight_kg`, `budget`, `lang`, `onboarded`, `created_at`, `updated_at` | Onboarding profile used to compute targets |
| `food_logs` | `id` (PK), `user_id`, `day` (yyyy-mm-dd), `food_id`, `name`, `qty`, `slot` (breakfast/lunch/snack/dinner), `nutrition` (jsonb: kcal, protein, carbs, fat, satFat, sugar, fiber, sodium), `at`, `created_at` | One row per logged food item |
| `day_water` | `user_id` + `day` (composite PK), `water_ml`, `updated_at` | Water intake per day |
| `weights` | `user_id` + `day` (composite PK), `kg` | Weight entries over time |
| `alert_dismissals` | `user_id` + `day` + `alert_id` (composite PK) | Smart alerts the user dismissed on a given day |

The client inserts/updates these tables through the generated typed client
(`@supabase/supabase-js`); there are no custom REST endpoints, so the request flow
is: React component → store action → typed client → PostgREST → RLS policy check
→ row written as the authenticated user.

## Nutrition engine

- Daily targets use the **Mifflin-St Jeor** BMR equation multiplied by an activity
  factor, adjusted by goal (loss/gain/muscle/maintain), with macro, fiber and water
  splits derived from the calorie target.
- Every food carries per-serving nutrition data (kcal, protein, carbs, fat, saturated
  fat, sugar, fiber, sodium) plus a cost in ₹; quantities scale the values linearly.
- The analyzer scores each result 0–100 from macro balance, fiber, sugar, sodium and
  saturated fat, and classifies it as *Better Choice / Moderate / Limit Frequency /
  Occasional / Least Preferred*.

## Error handling and testing strategy

- **Strict typing:** `tsc` strict mode plus ESLint (`typescript-eslint`,
  `react-hooks`, `react-refresh`) run on every build; type errors fail the build.
- **Error boundaries / capture:** `src/lib/error-capture.ts` wraps `console.error`
  and global `error` / `unhandledrejection` listeners, expands `Error` objects with
  their full cause chain (depth-limited to 5, description capped at 8 KB) and records
  them so the server (`src/server.ts`) can recover real stack traces instead of a
  generic HTTP 500; `src/lib/error-page.ts` renders a friendly fallback page.
- **Domain logic is unit-testable by design:** all nutrition math (BMR, targets,
  scaling, summation), health scoring and streak logic live in pure modules
  (`nutrition.ts`, `foods.ts`, `alerts.ts`) with no DOM or network access.
- **End-to-end verification:** every release was driven through the real app with a
  scripted browser (signup → onboarding → dashboard → analyzer → meal planner →
  progress → assistant → profile), verifying rendered data, writes and persistence.
- **Optimistic UI:** store actions update the interface immediately and persist the
  change to Postgres in the background, so the app stays responsive while writes are
  confirmed.

## Security and privacy

- Row-level security on every table, scoped to `auth.uid()`.
- No anonymous sign-ups; sessions are managed by the platform's auth service.
- Publishable keys only in the browser; all privileged credentials stay server-side.
- Users can delete all of their data at any time from the Profile page.

## Development

```sh
npm i
npm run dev     # local dev server
npm run build   # production build
npm run lint    # ESLint
```
