import type { Lang } from "./types";

const DICT = {
  home: { en: "Home", ta: "முகப்பு" },
  analyze: { en: "Analyze", ta: "ஆய்வு" },
  mealPlan: { en: "Meal Plan", ta: "உணவு திட்டம்" },
  progress: { en: "Progress", ta: "முன்னேற்றம்" },
  assistant: { en: "FoodFit AI", ta: "FoodFit AI" },
  profile: { en: "Profile", ta: "சுயவிவரம்" },
  todaysProgress: { en: "Today's Progress", ta: "இன்றைய முன்னேற்றம்" },
  todaysGoal: { en: "Today's Goal", ta: "இன்றைய இலக்கு" },
  addFood: { en: "+ Add Food", ta: "+ உணவு சேர்" },
  calories: { en: "Calories", ta: "கலோரி" },
  protein: { en: "Protein", ta: "புரதம்" },
  carbs: { en: "Carbohydrates", ta: "கார்போஹைட்ரேட்" },
  fat: { en: "Fat", ta: "கொழுப்பு" },
  fiber: { en: "Fiber", ta: "நார்ச்சத்து" },
  water: { en: "Water", ta: "தண்ணீர்" },
  disclaimer: {
    en: "Nutrition values are estimates and may vary based on ingredients, preparation method, brand, and serving size. AI FoodFit is designed for general wellness and nutrition guidance and does not replace professional medical or dietary advice.",
    ta: "ஊட்டச்சத்து மதிப்புகள் மதிப்பீடுகள் மட்டுமே; பொருட்கள், சமையல் முறை, பிராண்ட் மற்றும் அளவைப் பொறுத்து மாறும். AI FoodFit பொது நல வழிகாட்டலுக்கானது; மருத்துவ ஆலோசனைக்கு மாற்று அல்ல.",
  },
} as const;

export type Key = keyof typeof DICT;
export const t = (k: Key, lang: Lang) => DICT[k][lang];
