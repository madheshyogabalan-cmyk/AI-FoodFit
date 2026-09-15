import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EstimateTag } from "./bits";
import { BAND_META, healthScore, scale } from "@/lib/foodfit/nutrition";
import { foodById } from "@/lib/foodfit/foods";
import { useFoodFit } from "@/lib/foodfit/store";
import type { FoodItem, MealSlot } from "@/lib/foodfit/types";

const SLOTS: { v: MealSlot; l: string }[] = [
  { v: "breakfast", l: "Breakfast" },
  { v: "lunch", l: "Lunch" },
  { v: "snack", l: "Snack" },
  { v: "dinner", l: "Dinner" },
];

function guessSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 19) return "snack";
  return "dinner";
}

export default function NutritionResult({
  food,
  qty,
  onQtyChange,
  onSelectFood,
}: {
  food: FoodItem;
  qty: number;
  onQtyChange: (q: number) => void;
  onSelectFood?: (f: FoodItem) => void;
}) {
  const { addEntry, profile } = useFoodFit();
  const [slot, setSlot] = useState<MealSlot>(guessSlot());
  const nu = scale(food.per, qty);
  const hs = healthScore(nu, food.servingGrams * qty);
  const band = BAND_META[hs.band];
  const alts = (food.alternatives ?? [])
    .map(foodById)
    .filter((f): f is FoodItem => !!f);

  const rows: [string, string][] = [
    ["Calories", `${nu.kcal} kcal`],
    ["Protein", `${nu.protein} g`],
    ["Carbohydrates", `${nu.carbs} g`],
    ["Fat", `${nu.fat} g`],
    ["Saturated Fat", `${nu.satFat} g`],
    ["Sugar", `${nu.sugar} g`],
    ["Fiber", `${nu.fiber} g`],
    ["Sodium", `${nu.sodium} mg`],
  ];

  return (
    <div className="space-y-4">
      <div className="card-soft overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{food.emoji}</span>
              <h3 className="text-lg font-semibold">
                {profile?.lang === "ta" ? food.nameTa : food.name}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Serving: {qty} × {food.serving} · {Math.round(food.servingGrams * qty)} g total
            </p>
          </div>
          <EstimateTag />
        </div>

        <div className="flex items-center gap-2 px-5 pb-4">
          <span className="text-xs text-muted-foreground">Quantity</span>
          <div className="flex items-center gap-1 rounded-full border border-border">
            <button
              className="px-3 py-1 text-sm"
              onClick={() => onQtyChange(Math.max(0.5, Math.round((qty - 0.5) * 2) / 2))}
            >
              −
            </button>
            <span className="text-num w-10 text-center text-sm font-semibold">{qty}</span>
            <button className="px-3 py-1 text-sm" onClick={() => onQtyChange(qty + 0.5)}>
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 border-t border-border px-5 py-4">
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-border/60 py-2 last:border-0">
              <span className="text-xs text-muted-foreground">{l}</span>
              <span className="text-num text-sm font-semibold">{v}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Health Score</p>
              <p className="text-num text-2xl font-semibold">{hs.score} / 100</p>
            </div>
            <span
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: `var(--color-${band.token})`,
                color: `var(--color-${band.fg})`,
              }}
            >
              {band.emoji} {band.label}
            </span>

          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${hs.score}%`, backgroundColor: `var(--color-${band.token})` }}
            />
          </div>

          <p className="mt-4 text-sm font-semibold">Why?</p>
          <ul className="mt-1.5 space-y-1">
            {hs.pros.map((x) => (
              <li key={x} className="text-sm text-muted-foreground">
                ✓ {x}
              </li>
            ))}
            {hs.cons.map((x) => (
              <li key={x} className="text-sm text-muted-foreground">
                ⚠️ {x}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-secondary/70 p-3 text-xs text-secondary-foreground">
            This food can fit into a balanced diet depending on your portion size and personal goal.
          </p>
        </div>
      </div>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold">Add to today's log</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <button
              key={s.v}
              onClick={() => setSlot(s.v)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                slot === s.v ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            addEntry(food.id, qty, slot);
            toast.success(`${food.name} added to ${slot}`, {
              description: `${nu.kcal} kcal · ${nu.protein} g protein (estimated)`,
            });
          }}
        >
          Log {qty} × {food.name}
        </Button>
      </div>

      {alts.length > 0 && (
        <div className="card-soft p-5">
          <p className="text-sm font-semibold">Alternative Suggestions</p>
          <p className="text-xs text-muted-foreground">Similar options with a different nutrition mix.</p>
          <div className="mt-3 space-y-2">
            {alts.map((a) => {
              const an = a.per;
              return (
                <button
                  key={a.id}
                  onClick={() => onSelectFood?.(a)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-secondary"
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {an.kcal} kcal · {an.protein} g protein · {an.fiber} g fibre · {a.serving}
                    </span>
                  </span>
                  <span className="text-xs text-primary">View</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
