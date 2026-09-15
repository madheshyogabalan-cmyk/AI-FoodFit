import type { Goal, Nutrition, Profile, Targets } from "./types";

export const EMPTY: Nutrition = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  satFat: 0,
  sugar: 0,
  fiber: 0,
  sodium: 0,
};

export function scale(n: Nutrition, q: number): Nutrition {
  const r = (v: number) => Math.round(v * q * 10) / 10;
  return {
    kcal: Math.round(n.kcal * q),
    protein: r(n.protein),
    carbs: r(n.carbs),
    fat: r(n.fat),
    satFat: r(n.satFat),
    sugar: r(n.sugar),
    fiber: r(n.fiber),
    sodium: Math.round(n.sodium * q),
  };
}

export function sum(list: Nutrition[]): Nutrition {
  return list.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
      satFat: a.satFat + b.satFat,
      sugar: a.sugar + b.sugar,
      fiber: a.fiber + b.fiber,
      sodium: a.sodium + b.sodium,
    }),
    { ...EMPTY },
  );
}

const ACTIVITY: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

export const GOAL_META: Record<Goal, { label: string; emoji: string; kcalDelta: number }> = {
  loss: { label: "Weight Loss", emoji: "🔥", kcalDelta: -450 },
  gain: { label: "Healthy Weight Gain", emoji: "💪", kcalDelta: 400 },
  muscle: { label: "Muscle Building", emoji: "🏋️", kcalDelta: 250 },
  maintain: { label: "Weight Maintenance", emoji: "⚖️", kcalDelta: 0 },
  healthy: { label: "General Healthy Eating", emoji: "🥗", kcalDelta: 0 },
};

export function computeTargets(p: Profile): Targets {
  const s = p.sex === "female" ? -161 : 5;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
  const tdee = bmr * ACTIVITY[p.activity];
  const kcal = Math.max(1200, Math.round((tdee + GOAL_META[p.goal].kcalDelta) / 10) * 10);
  const proteinPerKg = p.goal === "muscle" ? 1.8 : p.goal === "loss" ? 1.6 : p.goal === "gain" ? 1.6 : 1.2;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber: Math.max(25, Math.round(kcal / 70)),
    waterL: Math.round((p.weightKg * 0.033 + 0.3) * 10) / 10,
  };
}

export type ScoreBand = "better" | "moderate" | "limit" | "high";

export const BAND_META: Record<
  ScoreBand,
  { label: string; emoji: string; token: string; fg: string }
> = {
  better: { label: "Better Choice", emoji: "🟢", token: "band-better", fg: "primary-foreground" },
  moderate: { label: "Moderate", emoji: "🟡", token: "band-moderate", fg: "accent-foreground" },
  limit: { label: "Limit Frequency", emoji: "🟠", token: "band-limit", fg: "accent-foreground" },
  high: { label: "High in Certain Nutrients", emoji: "🔴", token: "band-high", fg: "primary-foreground" },
};


export interface HealthScore {
  score: number;
  band: ScoreBand;
  pros: string[];
  cons: string[];
}

/** Simple transparent heuristic scoring — clearly an estimate. */
export function healthScore(nu: Nutrition, grams: number): HealthScore {
  let score = 72;
  const pros: string[] = [];
  const cons: string[] = [];
  const per100 = (v: number) => (grams > 0 ? (v * 100) / grams : v);

  const proteinDensity = nu.kcal > 0 ? (nu.protein * 4 * 100) / nu.kcal : 0;
  if (proteinDensity >= 25) {
    score += 14;
    pros.push("Good protein content");
  } else if (proteinDensity >= 12) {
    score += 7;
    pros.push("Provides a decent amount of protein");
  } else {
    score -= 4;
    cons.push("Low in protein for its calories");
  }

  if (nu.fiber >= 5) {
    score += 10;
    pros.push("Good source of fibre");
  } else if (nu.fiber >= 2.5) {
    score += 4;
    pros.push("Contains some fibre");
  } else {
    score -= 5;
    cons.push("Low in fibre");
  }

  if (nu.kcal >= 550) {
    score -= 14;
    cons.push("Relatively high calories");
  } else if (nu.kcal >= 350) {
    score -= 6;
    cons.push("Moderately calorie dense");
  } else {
    pros.push("Fits easily into most calorie targets");
  }

  if (nu.satFat >= 7) {
    score -= 12;
    cons.push("Higher saturated fat");
  } else if (nu.satFat >= 4) {
    score -= 5;
    cons.push("Moderate saturated fat");
  }

  if (nu.sodium >= 800) {
    score -= 13;
    cons.push("Higher sodium");
  } else if (nu.sodium >= 450) {
    score -= 6;
    cons.push("Moderate sodium");
  } else {
    pros.push("Low in sodium");
  }

  if (nu.sugar >= 15 && per100(nu.sugar) > 8) {
    score -= 10;
    cons.push("High in sugars");
  } else if (nu.sugar >= 8) {
    score -= 4;
    cons.push("Some added or natural sugars");
  }

  if (nu.kcal < 350 && nu.kcal > 60) pros.push("Provides steady energy");

  score = Math.max(5, Math.min(98, Math.round(score)));
  const band: ScoreBand =
    score >= 75 ? "better" : score >= 55 ? "moderate" : score >= 38 ? "limit" : "high";
  return { score, band, pros: pros.slice(0, 3), cons: cons.slice(0, 4) };
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
