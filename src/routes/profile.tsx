import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/foodfit/AppShell";
import { Chip, SectionTitle } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/foodfit/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeTargets, GOAL_META } from "@/lib/foodfit/nutrition";
import { buildWeeklyReport, downloadCSV, printReport } from "@/lib/foodfit/report";
import { useFoodFit } from "@/lib/foodfit/store";
import type { ActivityLevel, FoodPref, Goal, Lang, Profile } from "@/lib/foodfit/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile & Daily Targets — AI FoodFit" },
      {
        name: "description",
        content:
          "Edit your height, weight, activity level, food preference, goal, budget and language, and see updated estimated targets.",
      },
      { property: "og:title", content: "Profile — AI FoodFit" },
      {
        property: "og:description",
        content: "Manage your nutrition profile and personalised estimated daily targets.",
      },
    ],
  }),
  component: ProfilePage,
});

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

function ProfilePage() {
  return (
    <AppShell title="Profile" subtitle="Personal info and daily targets">
      <ProfileEditor />
    </AppShell>
  );
}

function ProfileEditor() {
  const { profile, setProfile, reset, days, weights } = useFoodFit();
  const { signOut } = useAuth();
  const [draft, setDraft] = useState<Profile | null>(profile);
  if (!profile || !draft) return null;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setDraft((s) => (s ? { ...s, [k]: v } : s));
  const targets = computeTargets(draft);

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <SectionTitle>Personal information</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="n">Name</Label>
            <Input id="n" className="mt-1.5" value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="a">Age</Label>
            <Input
              id="a"
              className="mt-1.5"
              type="number"
              value={draft.age}
              onChange={(e) => set("age", Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="hh">Height (cm)</Label>
            <Input
              id="hh"
              className="mt-1.5"
              type="number"
              value={draft.heightCm}
              onChange={(e) => set("heightCm", Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="ww">Weight (kg)</Label>
            <Input
              id="ww"
              className="mt-1.5"
              type="number"
              value={draft.weightKg}
              onChange={(e) => set("weightKg", Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="tw2">Target weight (kg)</Label>
            <Input
              id="tw2"
              className="mt-1.5"
              type="number"
              value={draft.targetWeightKg ?? ""}
              onChange={(e) => set("targetWeightKg", Number(e.target.value) || undefined)}
            />
          </div>
          <div>
            <Label htmlFor="bd">Daily budget (₹)</Label>
            <Input
              id="bd"
              className="mt-1.5"
              type="number"
              value={draft.budget ?? ""}
              onChange={(e) => set("budget", Number(e.target.value) || undefined)}
            />
          </div>
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Activity level</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <Chip key={a.v} active={draft.activity === a.v} onClick={() => set("activity", a.v)}>
              {a.l}
            </Chip>
          ))}
        </div>
        <SectionTitle>
          <span className="mt-5 block">Food preference</span>
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {PREFS.map((f) => (
            <Chip key={f.v} active={draft.pref === f.v} onClick={() => set("pref", f.v)}>
              {f.l}
            </Chip>
          ))}
        </div>
        <SectionTitle>
          <span className="mt-5 block">Language</span>
        </SectionTitle>
        <div className="flex gap-2">
          {(["en", "ta"] as Lang[]).map((l) => (
            <Chip key={l} active={draft.lang === l} onClick={() => set("lang", l)}>
              {l === "en" ? "English" : "தமிழ்"}
            </Chip>
          ))}
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Primary goal</SectionTitle>
        <div className="grid gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => set("goal", g)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left ${
                draft.goal === g ? "border-primary bg-secondary" : "border-border"
              }`}
            >
              <span className="text-lg">{GOAL_META[g].emoji}</span>
              <span className="text-sm font-medium">{GOAL_META[g].label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Estimated daily targets</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Calories", v: `${targets.kcal} kcal`, c: "primary" },
            { l: "Protein", v: `${targets.protein} g`, c: "protein" },
            { l: "Carbohydrates", v: `${targets.carbs} g`, c: "carbs" },
            { l: "Fat", v: `${targets.fat} g`, c: "fat" },
            { l: "Fiber", v: `${targets.fiber} g`, c: "fiber" },
            { l: "Water", v: `${targets.waterL} L`, c: "water" },
          ].map((x) => (
            <div key={x.l} className="rounded-xl border border-border p-3.5">
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: `var(--color-${x.c})` }} />
              <p className="mt-2 text-xs text-muted-foreground">{x.l}</p>
              <p className="text-num text-lg font-semibold">{x.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card-soft p-5">
        <SectionTitle>Weekly nutrition report</SectionTitle>
        <p className="text-xs text-muted-foreground">
          Export the last 7 days of calories, macros, fibre, water and health scores.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              downloadCSV(buildWeeklyReport(days, weights, targets, profile));
              toast.success("CSV report downloaded");
            }}
          >
            <Download className="mr-1.5 size-4" /> Download CSV
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const ok = printReport(buildWeeklyReport(days, weights, targets, profile));
              if (!ok) toast.error("Allow pop-ups to open the printable report");
            }}
          >
            <Printer className="mr-1.5 size-4" /> Print / PDF
          </Button>
        </div>
      </section>


      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => {
            setProfile(draft);
            toast.success("Profile updated", { description: "Your estimated targets were recalculated." });
          }}
        >
          Save changes
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            toast("Profile cleared — onboarding restarted");
          }}
        >
          Reset app
        </Button>
      </div>

      <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
