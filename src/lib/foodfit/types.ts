export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very";
export type FoodPref = "veg" | "nonveg" | "vegan" | "egg" | "none";
export type Goal = "loss" | "gain" | "muscle" | "maintain" | "healthy";
export type Lang = "en" | "ta";

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  pref: FoodPref;
  goal: Goal;
  targetWeightKg?: number;
  budget?: number;
  lang: Lang;
}

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nameTa: string;
  serving: string;
  servingGrams: number;
  per: Nutrition; // per one serving
  tags: FoodPref[];
  cost: number; // ₹ per serving
  aliases?: string[];
  alternatives?: string[]; // food ids
  emoji: string;
}

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export interface LogEntry {
  id: string;
  foodId: string;
  name: string;
  qty: number;
  slot: MealSlot;
  nutrition: Nutrition;
  at: number;
}

export interface DayLog {
  date: string; // yyyy-mm-dd
  entries: LogEntry[];
  waterMl: number;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterL: number;
}
