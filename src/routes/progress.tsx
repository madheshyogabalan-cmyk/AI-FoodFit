import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Minus, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/foodfit/AppShell";
import { Chip, EstimateTag, HydrationDots, SectionTitle } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFoodFit } from "@/lib/foodfit/store";
import { sum, todayKey } from "@/lib/foodfit/nutrition";
import { betterAlternatives, needsBetterOption } from "@/lib/foodfit/alternatives";
import { buildWeeklyReport, downloadCSV, printReport } from "@/lib/foodfit/report";
import { parseQuery } from "@/lib/foodfit/foods";
import type { MealSlot } from "@/lib/foodfit/types";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Daily Tracker & Weekly Progress — AI FoodFit" },
      {
        name: "description",
        content:
          "Edit any day's food log, follow hydration streaks and export a weekly nutrition report with weight, calorie and protein trends.",
      },
      { property: "og:title", content: "Progress — AI FoodFit" },
      {
        property: "og:description",
        content:
          "Editable food history, hydration streaks, weekly charts and a downloadable nutrition report.",
      },
    ],
  }),
  component: ProgressPage,
});

const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

function ProgressPage() {
  return (
    <AppShell title="Progress" subtitle="Editable history, streaks and weekly trends">
      <ProgressView />
    </AppShell>
  );
}

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  if (date === todayKey()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function ProgressView() {
  const {
    profile,
    targets,
    days,
    weights,
    dayLog,
    removeEntry,
    updateEntry,
    addEntryOn,
    setWaterOn,
    hydrationStreak,
    hydrationWeek,
  } = useFoodFit();

  const [selected, setSelected] = useState(todayKey());
  const [newFood, setNewFood] = useState("");
  const [newSlot, setNewSlot] = useState<MealSlot>("snack");

  const dayOptions = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(todayKey(d));
    }
    return out;
  }, []);

  const weekly = useMemo(() => {
    const out: { week: string; kcal: number; protein: number; water: number; logged: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const rows: { kcal: number; protein: number; water: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (w * 7 + d));
        const day = days[todayKey(date)];
        if (day && day.entries.length) {
          const s = sum(day.entries.map((e) => e.nutrition));
          rows.push({ kcal: s.kcal, protein: s.protein, water: day.waterMl / 1000 });
        }
      }
      const n = Math.max(1, rows.length);
      out.push({
        week: `Week ${4 - w}`,
        kcal: Math.round(rows.reduce((a, r) => a + r.kcal, 0) / n),
        protein: Math.round(rows.reduce((a, r) => a + r.protein, 0) / n),
        water: Math.round((rows.reduce((a, r) => a + r.water, 0) / n) * 10) / 10,
        logged: rows.length,
      });
    }
    return out;
  }, [days]);

  if (!targets || !profile) return null;

  const day = dayLog(selected);
  const totals = sum(day.entries.map((e) => e.nutrition));
  const weightData = weights.map((w, i) => ({ week: `W${i + 1}`, kg: w.kg }));
  const consistency = Math.round(
    (weekly.reduce((a, w) => a + w.logged, 0) / (weekly.length * 7)) * 100,
  );
  const report = buildWeeklyReport(days, weights, targets, profile);

  const handleAdd = () => {
    const parsed = parseQuery(newFood);
    if (!parsed) {
      toast.error("Food not recognised", { description: "Try something like “2 idli” or “100g rice”." });
      return;
    }
    addEntryOn(selected, parsed.food.id, parsed.qty, newSlot);
    setNewFood("");
    toast.success(`${parsed.qty} × ${parsed.food.name} added to ${dayLabel(selected)}`);
  };

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <SectionTitle action={<EstimateTag />}>Food history</SectionTitle>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dayOptions.map((d) => (
            <Chip
              key={d}
              active={selected === d}
              onClick={() => setSelected(d)}
              className="shrink-0 whitespace-nowrap text-xs"
            >
              {dayLabel(d)}
            </Chip>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {SLOT_ORDER.map((slot) => {
            const items = day.entries.filter((e) => e.slot === slot);
            const s = sum(items.map((e) => e.nutrition));
            return (
              <div key={slot}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold capitalize">{slot}</p>
                  <p className="text-num text-xs text-muted-foreground">
                    {s.kcal} kcal | {Math.round(s.protein)} g protein
                  </p>
                </div>
                {items.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Not logged yet</p>
                ) : (
                  <div className="mt-1.5 space-y-1.5">
                    {items.map((e) => {
                      const alts = needsBetterOption(e.foodId)
                        ? betterAlternatives(e.foodId, {
                            lang: profile.lang,
                            pref: profile.pref,
                            limit: 2,
                          })
                        : [];
                      return (
                        <div key={e.id} className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">
                              {e.qty} × {e.name}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-num text-xs text-muted-foreground">
                                {e.nutrition.kcal} kcal
                              </span>
                              <button
                                aria-label={`Decrease ${e.name}`}
                                onClick={() => updateEntry(selected, e.id, { qty: e.qty - 0.5 })}
                                className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <button
                                aria-label={`Increase ${e.name}`}
                                onClick={() => updateEntry(selected, e.id, { qty: e.qty + 0.5 })}
                                className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="size-3.5" />
                              </button>
                              <button
                                aria-label={`Remove ${e.name}`}
                                onClick={() => removeEntry(e.id, selected)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">Move to</span>
                            {SLOT_ORDER.filter((sl) => sl !== e.slot).map((sl) => (
                              <button
                                key={sl}
                                onClick={() => updateEntry(selected, e.id, { slot: sl })}
                                className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize hover:bg-secondary"
                              >
                                {sl}
                              </button>
                            ))}
                          </div>
                          {alts.length > 0 && (
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              💡 Better option next time:{" "}
                              {alts
                                .map(
                                  (a) =>
                                    `${profile.lang === "ta" ? a.food.nameTa : a.food.name} (${a.reason})`,
                                )
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Add a food to {dayLabel(selected)}
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={newFood}
              placeholder="e.g. 2 idli"
              onChange={(ev) => setNewFood(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SLOT_ORDER.map((sl) => (
              <Chip
                key={sl}
                active={newSlot === sl}
                onClick={() => setNewSlot(sl)}
                className="capitalize text-xs"
              >
                {sl}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
          {[
            { l: "Calories", v: `${totals.kcal}` },
            { l: "Protein", v: `${Math.round(totals.protein)} g` },
            { l: "Carbs", v: `${Math.round(totals.carbs)} g` },
            { l: "Fat", v: `${Math.round(totals.fat)} g` },
          ].map((x) => (
            <div key={x.l}>
              <p className="text-[11px] text-muted-foreground">{x.l}</p>
              <p className="text-num text-sm font-semibold">{x.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Water on {dayLabel(selected)}</p>
            <p className="text-num text-xs text-muted-foreground">
              {(day.waterMl / 1000).toFixed(2)} / {targets.waterL} L
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setWaterOn(selected, day.waterMl + 250)}>
              +250 ml
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWaterOn(selected, day.waterMl - 250)}>
              −250 ml
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWaterOn(selected, 0)}>
              Clear
            </Button>
          </div>
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle
          action={<span className="text-num text-xs text-muted-foreground">🔥 {hydrationStreak} days</span>}
        >
          Hydration Streak
        </SectionTitle>
        <div className="flex items-center justify-between">
          <HydrationDots week={hydrationWeek} />
          <p className="text-xs text-muted-foreground">
            {hydrationWeek.filter((d) => d.met).length}/7 days at goal
          </p>
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle action={<EstimateTag />}>Weekly nutrition report</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Avg kcal", v: report.avg.kcal },
            { l: "Avg protein", v: `${report.avg.protein} g` },
            { l: "Avg score", v: `${report.avg.score}/100` },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] text-muted-foreground">{x.l}</p>
              <p className="text-num text-sm font-semibold">{x.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => downloadCSV(report)}>
            <Download className="mr-1.5 size-4" /> CSV
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (!printReport(report)) toast.error("Allow pop-ups to open the printable report");
            }}
          >
            <Printer className="mr-1.5 size-4" /> Print / PDF
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Covers the last 7 days ({report.from} → {report.to}), {report.loggedDays} of 7 days logged.
        </p>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Weight Trend</SectionTitle>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Average Calories & Protein</SectionTitle>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="kcal" name="kcal" fill="var(--color-carbs)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="protein" name="protein g" fill="var(--color-protein)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          {
            l: "Goal completion",
            v: `${Math.min(100, Math.round((totals.kcal / targets.kcal) * 100))}%`,
          },
          { l: "Meal consistency", v: `${consistency}%` },
          { l: "Avg water", v: `${weekly[weekly.length - 1]?.water ?? 0} L` },
          {
            l: "Target weight",
            v: `${weights[weights.length - 1]?.kg ?? "—"} kg now`,
          },
        ].map((x) => (
          <div key={x.l} className="card-soft p-4">
            <p className="text-xs text-muted-foreground">{x.l}</p>
            <p className="text-num text-lg font-semibold">{x.v}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
