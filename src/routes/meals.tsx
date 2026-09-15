import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import AppShell from "@/components/foodfit/AppShell";
import { Chip, EstimateTag, SectionTitle } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPlan } from "@/lib/foodfit/ai";
import { betterAlternatives } from "@/lib/foodfit/alternatives";
import { GOAL_META } from "@/lib/foodfit/nutrition";
import { useFoodFit } from "@/lib/foodfit/store";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Smart Meal Planner & Budget Diet — AI FoodFit" },
      {
        name: "description",
        content:
          "Goal-aware Indian meal plans with estimated calories, protein and cost, plus a smart budget diet mode.",
      },
      { property: "og:title", content: "Smart Meal Planner — AI FoodFit" },
      {
        property: "og:description",
        content: "Breakfast, lunch, snack and dinner ideas matched to your goal, preference and budget.",
      },
    ],
  }),
  component: MealsPage,
});

function MealsPage() {
  return (
    <AppShell title="Meal Plan" subtitle="Goal and budget aware suggestions">
      <Planner />
    </AppShell>
  );
}

function Planner() {
  const { profile, targets, addEntry } = useFoodFit();
  const [budget, setBudget] = useState(profile?.budget ?? 150);
  const [budgetMode, setBudgetMode] = useState(false);

  const plan = useMemo(
    () => (profile && targets ? buildPlan(profile, targets, budgetMode ? budget : undefined) : []),
    [profile, targets, budget, budgetMode],
  );
  if (!profile || !targets) return null;

  const dayCost = plan.reduce((a, m) => a + m.cost, 0);
  const dayKcal = plan.reduce((a, m) => a + m.nutrition.kcal, 0);
  const dayProtein = Math.round(plan.reduce((a, m) => a + m.nutrition.protein, 0));

  return (
    <div className="space-y-5">
      <div className="card-soft p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Planning for</p>
            <p className="text-sm font-semibold">
              {GOAL_META[profile.goal].emoji} {GOAL_META[profile.goal].label}
            </p>
          </div>
          <EstimateTag />
        </div>
        <div className="mt-4 flex gap-2">
          <Chip active={!budgetMode} onClick={() => setBudgetMode(false)} className="flex-1">
            Smart Plan
          </Chip>
          <Chip active={budgetMode} onClick={() => setBudgetMode(true)} className="flex-1">
            💰 Budget Diet
          </Chip>
        </div>
        {budgetMode && (
          <div className="mt-4">
            <label className="text-xs text-muted-foreground" htmlFor="bud">
              Daily food budget (₹)
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="bud"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
              />
              <Button variant="outline" onClick={() => setBudget(150)}>
                ₹150
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Costs are estimates and vary by location and local food prices.
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Calories", v: `${dayKcal} kcal` },
            { l: "Protein", v: `${dayProtein} g` },
            { l: "Cost", v: `₹${dayCost}` },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] text-muted-foreground">{x.l}</p>
              <p className="text-num text-sm font-semibold">{x.v}</p>
            </div>
          ))}
        </div>
      </div>

      {plan.map((m) => (
        <section key={m.slot} className="card-soft p-5">
          <SectionTitle
            action={
              <span className="text-num text-xs text-muted-foreground">
                {m.nutrition.kcal} kcal · {Math.round(m.nutrition.protein)} g P · ₹{m.cost}
              </span>
            }
          >
            <span className="capitalize">{m.slot}</span>
          </SectionTitle>
          <p className="text-sm font-medium text-primary">{m.title}</p>
          <div className="mt-3 space-y-1.5">
            {m.items.map((f, i) => {
              const alts = betterAlternatives(f.id, {
                lang: profile.lang,
                pref: profile.pref,
                cheaperFirst: budgetMode,
                limit: 2,
              });
              return (
                <div key={f.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {m.qty[i]} × {profile.lang === "ta" ? f.nameTa : f.name}
                    </span>
                    <span className="text-num text-xs text-muted-foreground">
                      {Math.round(f.per.kcal * (m.qty[i] ?? 1))} kcal
                    </span>
                  </div>
                  {alts.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        {profile.lang === "ta" ? "மாற்று" : "Swap"}
                      </span>
                      {alts.map((a) => (
                        <button
                          key={a.food.id}
                          onClick={() => {
                            addEntry(a.food.id, m.qty[i] ?? 1, m.slot);
                            toast.success(
                              `${m.qty[i] ?? 1} × ${profile.lang === "ta" ? a.food.nameTa : a.food.name} logged`,
                              { description: a.reason },
                            );
                          }}
                          className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-secondary"
                        >
                          🔄 {profile.lang === "ta" ? a.food.nameTa : a.food.name}
                          <span className="text-muted-foreground"> · {a.reason}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              m.items.forEach((f, i) => addEntry(f.id, m.qty[i] ?? 1, m.slot));
              toast.success(`${m.title} logged to ${m.slot}`);
            }}
          >
            Log this {m.slot}
          </Button>
        </section>
      ))}
    </div>
  );
}
