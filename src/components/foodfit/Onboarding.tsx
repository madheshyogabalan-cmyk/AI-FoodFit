import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "./bits";
import { computeTargets, GOAL_META } from "@/lib/foodfit/nutrition";
import { useFoodFit } from "@/lib/foodfit/store";
import type { ActivityLevel, FoodPref, Goal, Lang, Profile, Sex } from "@/lib/foodfit/types";

const ACTIVITIES: { v: ActivityLevel; l: string }[] = [
  { v: "sedentary", l: "Sedentary" },
  { v: "light", l: "Lightly Active" },
  { v: "moderate", l: "Moderately Active" },
  { v: "very", l: "Very Active" },
];
const PREFS: { v: FoodPref; l: string }[] = [
  { v: "veg", l: "Vegetarian" },
  { v: "nonveg", l: "Non-Vegetarian" },
  { v: "vegan", l: "Vegan" },
  { v: "egg", l: "Eggetarian" },
  { v: "none", l: "No Preference" },
];
const GOALS: Goal[] = ["loss", "gain", "muscle", "maintain", "healthy"];

export default function Onboarding() {
  const { setProfile } = useFoodFit();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>({
    name: "",
    age: 24,
    sex: "male",
    heightCm: 170,
    weightKg: 62,
    activity: "moderate",
    pref: "none",
    goal: "gain",
    targetWeightKg: 68,
    budget: 150,
    lang: "en",
  });
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  const targets = computeTargets(p);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient px-6 pb-10 pt-12 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">AI FoodFit</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Scan it. Understand it.
          <br />
          Track it. Improve it.
        </h1>
        <p className="mt-3 max-w-sm text-sm opacity-90">
          A quick setup so your nutrition estimates match your body and goal.
        </p>
      </div>

      <div className="mx-auto max-w-lg px-5 pb-16">
        <div className="card-soft -mt-6 space-y-5 p-5">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">About you</h2>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={p.name}
                  placeholder="Your name"
                  onChange={(e) => set("name", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={p.age}
                    onChange={(e) => set("age", Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Sex</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {([
                      { v: "male", l: "Male" },
                      { v: "female", l: "Female" },
                      { v: "other", l: "Other" },
                    ] as { v: Sex; l: string }[]).map((s) => (
                      <Chip key={s.v} active={p.sex === s.v} onClick={() => set("sex", s.v)}>
                        {s.l}
                      </Chip>
                    ))}

                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="h">Height (cm)</Label>
                  <Input
                    id="h"
                    type="number"
                    value={p.heightCm}
                    onChange={(e) => set("heightCm", Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="w">Weight (kg)</Label>
                  <Input
                    id="w"
                    type="number"
                    value={p.weightKg}
                    onChange={(e) => set("weightKg", Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Activity & food</h2>
              <div>
                <Label>Activity level</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ACTIVITIES.map((a) => (
                    <Chip key={a.v} active={p.activity === a.v} onClick={() => set("activity", a.v)}>
                      {a.l}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Food preference</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PREFS.map((f) => (
                    <Chip key={f.v} active={p.pref === f.v} onClick={() => set("pref", f.v)}>
                      {f.l}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>Preferred language</Label>
                <div className="mt-2 flex gap-2">
                  {(["en", "ta"] as Lang[]).map((l) => (
                    <Chip key={l} active={p.lang === l} onClick={() => set("lang", l)}>
                      {l === "en" ? "English" : "தமிழ்"}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Your primary goal</h2>
              <div className="grid gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("goal", g)}
                    className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                      p.goal === g ? "border-primary bg-secondary" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-xl">{GOAL_META[g].emoji}</span>
                    <span className="text-sm font-medium">{GOAL_META[g].label}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tw">Target weight (optional)</Label>
                  <Input
                    id="tw"
                    type="number"
                    value={p.targetWeightKg ?? ""}
                    onChange={(e) => set("targetWeightKg", Number(e.target.value) || undefined)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="b">Daily budget ₹ (optional)</Label>
                  <Input
                    id="b"
                    type="number"
                    value={p.budget ?? ""}
                    onChange={(e) => set("budget", Number(e.target.value) || undefined)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Your estimated daily targets</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Calories", v: `${targets.kcal} kcal`, c: "primary" },
                  { l: "Protein", v: `${targets.protein} g`, c: "protein" },
                  { l: "Carbohydrates", v: `${targets.carbs} g`, c: "carbs" },
                  { l: "Fat", v: `${targets.fat} g`, c: "fat" },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl border border-border bg-card p-3.5">
                    <div className="h-1 w-8 rounded-full" style={{ backgroundColor: `var(--color-${x.c})` }} />
                    <p className="mt-2 text-xs text-muted-foreground">{x.l}</p>
                    <p className="text-num text-lg font-semibold">{x.v}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
                These are estimates based on your height, weight, age, activity and goal. AI FoodFit
                supports general wellness and does not replace professional medical or dietary advice.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => (step === 3 ? setProfile({ ...p, name: p.name || "Friend" }) : setStep((s) => s + 1))}
            >
              {step === 3 ? "Start tracking" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
