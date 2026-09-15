import { FOODS, foodById } from "./foods";
import { healthScore } from "./nutrition";
import type { FoodItem, Lang, Profile } from "./types";

export interface AltSuggestion {
  food: FoodItem;
  kcalDelta: number;
  costDelta: number;
  proteinDelta: number;
  reason: string;
}

const scoreOf = (f: FoodItem) => healthScore(f.per, f.servingGrams).score;

function reasonFor(base: FoodItem, alt: FoodItem, lang: Lang): string {
  const kcal = Math.round(alt.per.kcal - base.per.kcal);
  const protein = Math.round(alt.per.protein - base.per.protein);
  const cost = Math.round(alt.cost - base.cost);
  const bits: string[] = [];
  if (kcal <= -30) bits.push(lang === "ta" ? `${Math.abs(kcal)} kcal குறைவு` : `${Math.abs(kcal)} kcal lighter`);
  if (protein >= 3) bits.push(lang === "ta" ? `+${protein} g புரதம்` : `+${protein} g protein`);
  if (alt.per.fiber - base.per.fiber >= 2)
    bits.push(lang === "ta" ? "அதிக நார்ச்சத்து" : "more fibre");
  if (alt.per.satFat < base.per.satFat - 2)
    bits.push(lang === "ta" ? "குறைந்த நிறைவுற்ற கொழுப்பு" : "less saturated fat");
  if (alt.per.sodium < base.per.sodium - 200)
    bits.push(lang === "ta" ? "குறைந்த சோடியம்" : "less sodium");
  if (cost <= -10) bits.push(lang === "ta" ? `₹${Math.abs(cost)} சேமிப்பு` : `saves ₹${Math.abs(cost)}`);
  if (bits.length === 0) bits.push(lang === "ta" ? "சமநிலையான தேர்வு" : "a more balanced choice");
  return bits.slice(0, 3).join(lang === "ta" ? ", " : " · ");
}

/** Better / cheaper swaps for a food, ranked by health score then cost. */
export function betterAlternatives(
  foodId: string,
  opts: { lang?: Lang; pref?: Profile["pref"]; cheaperFirst?: boolean; limit?: number } = {},
): AltSuggestion[] {
  const base = foodById(foodId);
  if (!base) return [];
  const lang = opts.lang ?? "en";
  const baseScore = scoreOf(base);

  const ids = new Set(base.alternatives ?? []);
  if (ids.size < 3) {
    for (const f of FOODS) {
      if (f.id === base.id) continue;
      if (scoreOf(f) > baseScore + 6) ids.add(f.id);
      if (ids.size >= 8) break;
    }
  }

  const list = [...ids]
    .map(foodById)
    .filter((f): f is FoodItem => !!f && f.id !== base.id)
    .filter((f) => (opts.pref && opts.pref !== "none" ? f.tags.includes(opts.pref) : true))
    .map((f) => ({
      food: f,
      kcalDelta: Math.round(f.per.kcal - base.per.kcal),
      costDelta: Math.round(f.cost - base.cost),
      proteinDelta: Math.round((f.per.protein - base.per.protein) * 10) / 10,
      reason: reasonFor(base, f, lang),
    }));

  list.sort((a, b) =>
    opts.cheaperFirst
      ? a.costDelta - b.costDelta || scoreOf(b.food) - scoreOf(a.food)
      : scoreOf(b.food) - scoreOf(a.food) || a.costDelta - b.costDelta,
  );
  return list.slice(0, opts.limit ?? 3);
}

/** True when an item is worth flagging with a "better option" hint. */
export function needsBetterOption(foodId: string): boolean {
  const f = foodById(foodId);
  if (!f) return false;
  return scoreOf(f) < 55;
}
