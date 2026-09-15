import type { DayLog, Lang, MealSlot, Nutrition, Targets } from "./types";

export type AlertTone = "warn" | "tip" | "good";

export interface SmartAlert {
  id: string;
  tone: AlertTone;
  emoji: string;
  text: string;
  action?: { label: string; to: string };
}

const SLOT_HOUR: Record<MealSlot, number> = {
  breakfast: 10,
  lunch: 15,
  snack: 18,
  dinner: 22,
};

const SLOT_LABEL: Record<MealSlot, { en: string; ta: string }> = {
  breakfast: { en: "breakfast", ta: "காலை உணவு" },
  lunch: { en: "lunch", ta: "மதிய உணவு" },
  snack: { en: "a snack", ta: "ஸ்நாக்" },
  dinner: { en: "dinner", ta: "இரவு உணவு" },
};

const addFood = (lang: Lang) => ({
  label: lang === "ta" ? "உணவு சேர்" : "Add food",
  to: "/analyze",
});

/**
 * Time-of-day aware smart alerts built from today's log and estimated targets.
 * Pure function — safe to call on every render.
 */
export function smartAlerts(
  totals: Nutrition,
  targets: Targets,
  day: DayLog,
  lang: Lang = "en",
  now: Date = new Date(),
): SmartAlert[] {
  const ta = lang === "ta";
  const out: SmartAlert[] = [];
  const hour = now.getHours();
  const dayPace = Math.min(1, Math.max(0.25, (hour - 6) / 15)); // expected share of the day done

  // Protein pacing
  const proteinPct = targets.protein > 0 ? totals.protein / targets.protein : 0;
  if (proteinPct < dayPace - 0.3) {
    out.push({
      id: "protein-behind",
      tone: "warn",
      emoji: "🥚",
      text: ta
        ? `புரதம் பின்தங்கியுள்ளது — இப்போது ${Math.round(totals.protein)} g / ${targets.protein} g. அடுத்த வேளையில் முட்டை, தயிர் அல்லது பருப்பு சேர்க்கவும்.`
        : `Protein is behind pace — ${Math.round(totals.protein)} g of ${targets.protein} g so far. Add eggs, curd, dal or paneer to your next meal.`,
      action: addFood(lang),
    });
  } else if (proteinPct >= 1) {
    out.push({
      id: "protein-done",
      tone: "good",
      emoji: "💪",
      text: ta
        ? "இன்றைய புரத இலக்கை எட்டிவிட்டீர்கள்."
        : "You've reached today's estimated protein target — nice work.",
    });
  }

  // Water pacing
  const waterGoal = targets.waterL * 1000;
  const waterPct = waterGoal > 0 ? day.waterMl / waterGoal : 0;
  if (waterPct < dayPace - 0.25) {
    out.push({
      id: "water-behind",
      tone: "tip",
      emoji: "💧",
      text: ta
        ? `நீர் அருந்துதல் குறைவு — ${(day.waterMl / 1000).toFixed(1)} L / ${targets.waterL} L. ஒரு டம்ளர் தண்ணீர் குடிக்கவும்.`
        : `Hydration is behind pace — ${(day.waterMl / 1000).toFixed(1)} L of ${targets.waterL} L. A glass of water now would help.`,
    });
  }

  // Calories
  if (totals.kcal > targets.kcal * 1.05) {
    out.push({
      id: "kcal-over",
      tone: "warn",
      emoji: "⚠️",
      text: ta
        ? `இன்றைய மதிப்பிடப்பட்ட கலோரி இலக்கை (${targets.kcal} kcal) தாண்டிவிட்டீர்கள். மீதி நேரத்தில் இலகுவான தேர்வுகள் நல்லது.`
        : `You're over today's estimated calorie target (${totals.kcal} of ${targets.kcal} kcal). Lighter choices for the rest of the day would balance it out.`,
    });
  } else if (hour >= 19 && totals.kcal < targets.kcal * 0.6) {
    out.push({
      id: "kcal-under",
      tone: "tip",
      emoji: "🍚",
      text: ta
        ? `இன்று ${totals.kcal} kcal மட்டுமே பதிவாகியுள்ளது — உணவு பதிவு விடுபட்டிருக்கலாம்.`
        : `Only ${totals.kcal} kcal logged today — you may be under-eating or a meal is missing from your log.`,
      action: addFood(lang),
    });
  }

  // Missing meal slots for the time of day
  const logged = new Set(day.entries.map((e) => e.slot));
  for (const slot of ["breakfast", "lunch", "dinner"] as MealSlot[]) {
    if (hour >= SLOT_HOUR[slot] && !logged.has(slot)) {
      out.push({
        id: `missing-${slot}`,
        tone: "tip",
        emoji: "🕒",
        text: ta
          ? `${SLOT_LABEL[slot].ta} இன்னும் பதிவு செய்யப்படவில்லை.`
          : `No ${SLOT_LABEL[slot].en} logged yet today.`,
        action: addFood(lang),
      });
      break;
    }
  }

  // Nutrient warnings
  if (totals.sodium > 2000) {
    out.push({
      id: "sodium-high",
      tone: "warn",
      emoji: "🧂",
      text: ta
        ? `மதிப்பிடப்பட்ட சோடியம் அதிகம் (${Math.round(totals.sodium)} mg). ஊறுகாய், பேக்கேஜ் உணவுகளைக் குறைக்கவும்.`
        : `Estimated sodium is high today (${Math.round(totals.sodium)} mg). Go easy on pickles, sauces and packaged snacks.`,
    });
  }
  if (totals.sugar > 45) {
    out.push({
      id: "sugar-high",
      tone: "warn",
      emoji: "🍬",
      text: ta
        ? `சர்க்கரை அளவு அதிகமாக மதிப்பிடப்பட்டுள்ளது (${Math.round(totals.sugar)} g).`
        : `Estimated sugars are on the higher side today (${Math.round(totals.sugar)} g).`,
    });
  }
  if (totals.fiber < targets.fiber * 0.4 && hour >= 16) {
    out.push({
      id: "fiber-low",
      tone: "tip",
      emoji: "🥗",
      text: ta
        ? "நார்ச்சத்து குறைவு — காய்கறி, சாலட் அல்லது பருப்பு சேர்க்கவும்."
        : "Fibre is low today — vegetables, salad, fruit or dal would help.",
    });
  }

  return out.slice(0, 4);
}
