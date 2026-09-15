import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Flame, X } from "lucide-react";
import AppShell from "@/components/foodfit/AppShell";
import { HydrationDots, MacroBar, Ring, SectionTitle } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { useFoodFit } from "@/lib/foodfit/store";
import { GOAL_META } from "@/lib/foodfit/nutrition";
import { smartAlerts } from "@/lib/foodfit/alerts";
import { t } from "@/lib/foodfit/i18n";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI FoodFit — Daily Nutrition Dashboard" },
      {
        name: "description",
        content:
          "Track estimated calories, protein, carbs, fat, fibre and water against your personalised daily targets.",
      },
      { property: "og:title", content: "AI FoodFit — Daily Nutrition Dashboard" },
      {
        property: "og:description",
        content: "Scan it. Understand it. Track it. Improve it — AI-powered nutrition estimates.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell title="Home" subtitle="Today's nutrition at a glance">
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const {
    profile,
    targets,
    totals,
    today,
    addWater,
    streak,
    hydrationStreak,
    hydrationWeek,
    dismissed,
    dismissAlert,
  } = useFoodFit();
  if (!profile || !targets) return null;
  const lang = profile.lang;
  const remaining = Math.max(0, targets.kcal - totals.kcal);
  const hidden = dismissed[today.date] ?? [];
  const list = smartAlerts(totals, targets, today, lang).filter((a) => !hidden.includes(a.id));


  return (
    <div className="space-y-5">
      <div className="hero-gradient card-soft border-0 p-5 text-primary-foreground">
        <p className="text-xs uppercase tracking-widest opacity-80">{t("todaysGoal", lang)}</p>
        <p className="mt-1 text-xl font-semibold">
          {GOAL_META[profile.goal].emoji} {GOAL_META[profile.goal].label}
        </p>
        <p className="mt-2 text-sm opacity-90">
          Hi {profile.name}, you are {remaining.toLocaleString()} kcal away from your estimated daily
          target.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link to="/analyze">{t("addFood", lang)}</Link>
          </Button>
          <span className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-2 text-xs font-semibold">
            <Flame className="size-4" /> {streak} day streak
          </span>
        </div>
      </div>

      <section className="card-soft p-5">
        <SectionTitle>{t("todaysProgress", lang)}</SectionTitle>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Ring value={totals.kcal} max={targets.kcal} label={t("calories", lang)} unit="kcal" />
          <Ring
            value={totals.protein}
            max={targets.protein}
            label={t("protein", lang)}
            unit="g"
            color="protein"
            size={112}
          />
        </div>
        <div className="mt-5 space-y-3.5">
          <MacroBar
            label={t("carbs", lang)}
            value={totals.carbs}
            max={targets.carbs}
            unit="g"
            color="carbs"
          />
          <MacroBar label={t("fat", lang)} value={totals.fat} max={targets.fat} unit="g" color="fat" />
          <MacroBar
            label={t("fiber", lang)}
            value={totals.fiber}
            max={targets.fiber}
            unit="g"
            color="fiber"
          />
          <MacroBar
            label={t("water", lang)}
            value={today.waterMl / 1000}
            max={targets.waterL}
            unit="L"
            color="water"
          />
        </div>
      </section>

      {list.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>{lang === "ta" ? "ஸ்மார்ட் அலர்ட்ஸ்" : "Smart Alerts"}</SectionTitle>
          {list.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm ${
                a.tone === "warn"
                  ? "border-[var(--color-band-limit)]/50 bg-accent/40"
                  : a.tone === "good"
                    ? "border-primary/40 bg-secondary"
                    : "border-border bg-card"
              }`}
            >
              <span className="text-base leading-none">{a.emoji}</span>
              <div className="flex-1">
                <p className="leading-relaxed">{a.text}</p>
                {a.action && (
                  <Link to={a.action.to} className="mt-1.5 inline-block text-xs font-semibold text-primary">
                    {a.action.label} →
                  </Link>
                )}
              </div>
              <button
                aria-label="Dismiss alert"
                onClick={() => dismissAlert(a.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="card-soft p-5">
        <SectionTitle
          action={<span className="text-num text-xs text-muted-foreground">🔥 {hydrationStreak} day streak</span>}
        >
          <span className="flex items-center gap-2">
            <Droplets className="size-4 text-[var(--color-water)]" /> Water Tracker
          </span>
        </SectionTitle>
        <p className="text-num text-2xl font-semibold">
          {(today.waterMl / 1000).toFixed(2)}{" "}
          <span className="text-sm font-normal text-muted-foreground">/ {targets.waterL} L</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <HydrationDots week={hydrationWeek} />
          <span className="text-[11px] text-muted-foreground">Last 7 days</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addWater(250)}>
            +250 ml
          </Button>
          <Button variant="outline" size="sm" onClick={() => addWater(500)}>
            +500 ml
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addWater(-250)}>
            −250 ml
          </Button>
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle action={<Link to="/progress" className="text-xs text-primary">View all</Link>}>
          Today's Food Timeline
        </SectionTitle>
        {today.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged yet — analyze a food to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {today.entries.slice(-4).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <span className="text-sm">
                  {e.qty} × {e.name}
                  <span className="ml-2 text-xs capitalize text-muted-foreground">{e.slot}</span>
                </span>
                <span className="text-num text-xs text-muted-foreground">
                  {e.nutrition.kcal} kcal · {e.nutrition.protein} g P
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { e: "🔥", l: "Healthy Eating Streak", v: `${streak} days` },
          { e: "🏆", l: "Protein Goal", v: totals.protein >= targets.protein ? "Achieved" : "In progress" },
          {
            e: "💧",
            l: "Hydration Streak",
            v: hydrationStreak > 0 ? `${hydrationStreak} days` : "Start today",
          },
          { e: "🥗", l: "Balanced Meal Badge", v: totals.fiber >= targets.fiber * 0.6 ? "Earned" : "Add veggies" },
        ].map((b) => (
          <div key={b.l} className="card-soft p-4">
            <p className="text-xl">{b.e}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.l}</p>
            <p className="text-sm font-semibold">{b.v}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
