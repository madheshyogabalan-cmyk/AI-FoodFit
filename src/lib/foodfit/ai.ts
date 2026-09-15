import { FOODS, foodById, parseQuery } from "./foods";
import { GOAL_META, healthScore, scale, sum } from "./nutrition";
import type { DayLog, FoodItem, MealSlot, Nutrition, Profile, Targets } from "./types";

/* ---------------- Simulated image recognition ---------------- */

const IMAGE_POOL = ["biryani", "dosa", "idli", "pizza", "burger", "fries", "salad", "fish"];

export interface Detection {
  food: FoodItem;
  confidence: number;
}

export async function simulateImageRecognition(seed: string): Promise<Detection[]> {
  await new Promise((r) => setTimeout(r, 1600));
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  const conf = [0.87, 0.62, 0.41];
  const ids = [h % IMAGE_POOL.length, (h + 3) % IMAGE_POOL.length, (h + 5) % IMAGE_POOL.length].map(
    (i) => IMAGE_POOL[i] ?? "idli",
  );
  return ids
    .map((id, i) => ({ food: foodById(id), confidence: conf[i] ?? 0.4 }))
    .filter((d): d is Detection => !!d.food);

}

/* ---------------- Meal planner ---------------- */

export interface PlannedMeal {
  slot: MealSlot;
  title: string;
  items: FoodItem[];
  qty: number[];
  nutrition: Nutrition;
  cost: number;
}

const allowed = (f: FoodItem, p: Profile) => f.tags.includes(p.pref);

const pick = (ids: string[], p: Profile) =>
  ids.map(foodById).filter((f): f is FoodItem => !!f && allowed(f, p));

export function buildPlan(p: Profile, targets: Targets, budget?: number): PlannedMeal[] {
  const tight = (budget ?? p.budget ?? 250) <= 180;
  const highProtein = p.goal === "muscle" || p.goal === "gain" || p.goal === "loss";

  const templates: { slot: MealSlot; title: string; ids: string[]; qty: number[] }[] = [
    {
      slot: "breakfast",
      title: tight ? "Budget Protein Breakfast" : "Balanced South Indian Breakfast",
      ids: highProtein ? ["idli", "sambar", "egg", "milk"] : ["dosa", "sambar", "curd"],
      qty: highProtein ? [3, 1, 2, 1] : [1, 1, 1],
    },
    {
      slot: "lunch",
      title: "Everyday Thali",
      ids: tight ? ["rice", "dal", "salad"] : ["rice", "dal", "chicken", "curd"],
      qty: tight ? [1, 1, 1] : [1, 1, 1, 1],
    },
    {
      slot: "snack",
      title: tight ? "₹ Friendly Snack" : "Smart Snack",
      ids: tight ? ["banana", "nuts"] : ["apple", "peanutbutter"],
      qty: [1, 1],
    },
    {
      slot: "dinner",
      title: highProtein ? "High-Protein Budget Dinner" : "Light Dinner",
      ids: highProtein ? ["rice", "dal", "egg", "curd", "salad"] : ["chapati", "dal", "salad"],
      qty: highProtein ? [1, 1, 2, 1, 1] : [2, 1, 1],
    },
  ];

  return templates.map((tpl) => {
    let items = pick(tpl.ids, p);
    let qty = tpl.ids
      .map((id, i) => (items.some((f) => f.id === id) ? (tpl.qty[i] ?? 1) : null))
      .filter((q): q is number => q !== null);
    if (items.length === 0) {
      items = pick(["rice", "dal", "salad"], p);
      qty = items.map(() => 1);
    }
    const nutrition = sum(items.map((f, i) => scale(f.per, qty[i] ?? 1)));
    const cost = Math.round(items.reduce((a, f, i) => a + f.cost * (qty[i] ?? 1), 0));
    return { ...tpl, items, qty, nutrition, cost };
  });
}


export function budgetDay(p: Profile, budget: number) {
  const plan = buildPlan(p, { kcal: 0 } as Targets, budget);
  const totalCost = plan.reduce((a, m) => a + m.cost, 0);
  const nutrition = sum(plan.map((m) => m.nutrition));
  return { plan, totalCost, nutrition };
}

/* ---------------- Smart alerts ---------------- */

export function alerts(totals: Nutrition, targets: Targets, day: DayLog) {
  const out: { tone: "warn" | "tip"; text: string }[] = [];
  if (totals.sodium > 2000)
    out.push({ tone: "warn", text: "Your estimated sodium intake is relatively high today." });
  if (totals.protein < targets.protein * 0.6)
    out.push({ tone: "tip", text: "You are currently below your estimated protein target." });
  if (totals.protein < targets.protein * 0.85)
    out.push({ tone: "tip", text: "Consider adding a protein-rich food to your next meal." });
  if (totals.kcal > targets.kcal * 0.85 && totals.kcal <= targets.kcal * 1.05)
    out.push({ tone: "tip", text: "Your calorie intake is approaching today's estimated target." });
  if (day.waterMl < targets.waterL * 1000 * 0.5)
    out.push({ tone: "tip", text: "A little more water would help you reach today's hydration goal." });
  return out.slice(0, 3);
}

/* ---------------- Simulated chat assistant ---------------- */

const TA = (s: string) => s;

function isTamil(q: string) {
  return /[\u0B80-\u0BFF]/.test(q) || /(sapta|sapdanum|evlo|venum|panna|epdi)/i.test(q);
}

export function assistantReply(
  question: string,
  p: Profile,
  targets: Targets,
  totals: Nutrition,
): string {
  const q = question.toLowerCase();
  const tamil = isTamil(question) || p.lang === "ta";

  // "how many calories have I eaten today"
  if (/(today|இன்று|innaiku).*(calorie|kcal|kalori)|calorie.*today/.test(q)) {
    return tamil
      ? TA(
          `இன்று நீங்கள் சுமார் ${totals.kcal} kcal மற்றும் ${Math.round(totals.protein)} g புரதம் எடுத்துள்ளீர்கள். இலக்கு ${targets.kcal} kcal / ${targets.protein} g. இது ஒரு மதிப்பீடு மட்டுமே.`,
        )
      : `Today you've logged about ${totals.kcal} kcal and ${Math.round(totals.protein)} g protein. Your estimated targets are ${targets.kcal} kcal and ${targets.protein} g protein — roughly ${Math.max(0, targets.kcal - totals.kcal)} kcal to go.`;
  }

  // protein in X
  const parsed = parseQuery(question.replace(/how much protein is in|calories in|is|good for/gi, " "));
  if (parsed && /(protein|calorie|kcal|nutrition|evlo|sapta)/.test(q)) {
    const nu = scale(parsed.food.per, parsed.qty);
    const hs = healthScore(nu, parsed.food.servingGrams * parsed.qty);
    return tamil
      ? TA(
          `${parsed.food.nameTa} (${parsed.qty} × ${parsed.food.serving}) — சுமார் ${nu.kcal} kcal, ${nu.protein} g புரதம், ${nu.carbs} g கார்ப்ஸ், ${nu.fat} g கொழுப்பு. ஹெல்த் ஸ்கோர் ${hs.score}/100. மதிப்பீடு மட்டுமே.`,
        )
      : `${parsed.qty} × ${parsed.food.serving} of ${parsed.food.name} is roughly ${nu.kcal} kcal, ${nu.protein} g protein, ${nu.carbs} g carbs and ${nu.fat} g fat. Estimated health score: ${hs.score}/100 (${hs.band}).`;
  }

  // budget dinner
  const money = q.match(/₹\s*(\d+)|rs\.?\s*(\d+)|(\d+)\s*(?:rupees|ருபாய்)/);
  if (money && /(dinner|lunch|breakfast|meal|day|சாப்பாடு)/.test(q)) {
    const amt = Number(money[1] ?? money[2] ?? money[3]);
    const { plan, totalCost, nutrition } = budgetDay(p, amt);
    const dinner = plan.find((m) => m.slot === "dinner")!;
    return tamil
      ? TA(
          `₹${amt} க்குள் அதிக புரத இரவு உணவு: ${dinner.items.map((f, i) => `${dinner.qty[i]} × ${f.nameTa}`).join(", ")} — சுமார் ${dinner.nutrition.kcal} kcal, ${dinner.nutrition.protein} g புரதம், ₹${dinner.cost}. முழு நாள் ~₹${totalCost} (${nutrition.kcal} kcal).`,
        )
      : `Here's a ₹${amt}-friendly high-protein dinner: ${dinner.items.map((f, i) => `${dinner.qty[i]} × ${f.name}`).join(", ")} — about ${dinner.nutrition.kcal} kcal, ${dinner.nutrition.protein} g protein, estimated ₹${dinner.cost}. Prices vary by location.`;
  }

  // weight gain / loss advice
  if (/(weight gain|gain weight|எடை|weight gain panna)/.test(q)) {
    return tamil
      ? TA(
          `ஆரோக்கியமான எடை அதிகரிப்புக்கு: முட்டை, பால், தயிர், பனீர், பருப்பு, சாதம், கொட்டைகள், வேர்க்கடலை வெண்ணெய் — நாளுக்கு ~${targets.kcal} kcal, ${targets.protein} g புரதம் இலக்கு. 3 வேளை + 2 ஸ்நாக்ஸ் நல்லது.`,
        )
      : `For healthy weight gain, aim for a modest surplus (~${targets.kcal} kcal) with ${targets.protein} g protein. Nutrient-dense picks: eggs, milk, curd, paneer, dal, rice, nuts, peanut butter, chicken and fish. Three meals plus two snacks makes the surplus easier.`;
  }
  if (/(weight loss|lose weight|dosa good|reduce)/.test(q)) {
    return tamil
      ? TA(
          `எடை குறைக்க: ~${targets.kcal} kcal, ${targets.protein} g புரதம். தோசை சரியான அளவில் (1–2) சாம்பார்/சட்னியுடன் நல்லது; எண்ணெய் குறைவாக இருந்தால் மேலும் நல்லது.`,
        )
      : `Dosa can fit a weight-loss plan — 1–2 dosa with sambar is around 170–340 kcal. Keep the oil light and add a protein source (egg, curd or dal). Your estimated targets: ${targets.kcal} kcal and ${targets.protein} g protein per day.`;
  }
  if (/(after workout|post workout|workout)/.test(q)) {
    return tamil
      ? TA("பயிற்சிக்குப் பிறகு: 2 முட்டை + சாதம், அல்லது தயிர் + வாழைப்பழம், அல்லது பால் + வேர்க்கடலை வெண்ணெய்.")
      : "After a workout, pair protein with carbs: 2 boiled eggs + rice, curd + banana, or milk with peanut butter. Roughly 20–30 g protein within an hour or two works well.";
  }
  if (/(vegetarian|veg).*(breakfast|protein)/.test(q)) {
    return "Vegetarian high-protein breakfast idea: 3 idli + sambar + 1 cup curd (~330 kcal, ~16 g protein), or paneer bhurji with 2 chapati (~430 kcal, ~24 g protein).";
  }
  if (/(doctor|disease|diabet|bp|thyroid|medicine|sick)/.test(q)) {
    return "I can share general wellness and nutrition information, but for anything related to a medical condition or medication, please check with a qualified healthcare professional or registered dietitian.";
  }

  const suggestion = FOODS.filter((f) => f.tags.includes(p.pref))
    .slice(0, 3)
    .map((f) => f.name)
    .join(", ");
  return tamil
    ? TA(
        `உங்கள் இலக்கு ${GOAL_META[p.goal].label}. இன்றைய மதிப்பீடு: ${totals.kcal}/${targets.kcal} kcal, ${Math.round(totals.protein)}/${targets.protein} g புரதம். உணவு பெயர் அல்லது பட்ஜெட் கேளுங்கள் — உதாரணம்: "₹100 protein dinner".`,
      )
    : `Your goal is ${GOAL_META[p.goal].label}, and today you're at ${totals.kcal}/${targets.kcal} kcal with ${Math.round(totals.protein)}/${targets.protein} g protein. Ask me about a specific food, a budget meal, or try: "${suggestion}". All values are estimates.`;
}

export const SUGGESTED_QUESTIONS = [
  "Is dosa good for weight loss?",
  "How much protein is in 3 eggs?",
  "Give me a ₹100 high-protein dinner.",
  "What can I eat after a workout?",
  "How many calories have I eaten today?",
  "2 dosa sapta evlo calories?",
];
