import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { computeTargets, scale, sum, todayKey, EMPTY } from "./nutrition";
import { foodById } from "./foods";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import type { DayLog, LogEntry, MealSlot, Nutrition, Profile, Targets } from "./types";

interface State {
  profile: Profile | null;
  days: Record<string, DayLog>;
  weights: { date: string; kg: number }[];
  /** dismissed smart-alert ids, per date */
  dismissed: Record<string, string[]>;
}

const EMPTY_STATE: State = { profile: null, days: {}, weights: [], dismissed: {} };

type ProfileRow = {
  name: string | null;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: string | null;
  pref: string | null;
  goal: string | null;
  target_weight_kg: number | null;
  budget: number | null;
  lang: string | null;
  onboarded: boolean | null;
};

const rowToProfile = (r: ProfileRow): Profile | null => {
  if (!r.onboarded || r.age == null || r.height_cm == null || r.weight_kg == null) return null;
  return {
    name: r.name ?? "",
    age: Number(r.age),
    sex: (r.sex ?? "other") as Profile["sex"],
    heightCm: Number(r.height_cm),
    weightKg: Number(r.weight_kg),
    activity: (r.activity ?? "light") as Profile["activity"],
    pref: (r.pref ?? "none") as Profile["pref"],
    goal: (r.goal ?? "healthy") as Profile["goal"],
    ...(r.target_weight_kg != null ? { targetWeightKg: Number(r.target_weight_kg) } : {}),
    ...(r.budget != null ? { budget: Number(r.budget) } : {}),
    lang: (r.lang ?? "en") as Profile["lang"],
  };
};

const seedRows = (userId: string) => {
  const seedFoods: [string, number, MealSlot][] = [
    ["idli", 2, "breakfast"],
    ["sambar", 1, "breakfast"],
    ["rice", 1, "lunch"],
    ["dal", 1, "lunch"],
    ["banana", 1, "snack"],
    ["egg", 2, "dinner"],
  ];
  const logs: {
    user_id: string;
    day: string;
    food_id: string;
    name: string;
    qty: number;
    slot: string;
    nutrition: Record<string, number>;
    at: string;
  }[] = [];
  const water: { user_id: string; day: string; water_ml: number }[] = [];
  for (let i = 1; i <= 21; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = todayKey(d);
    water.push({ user_id: userId, day, water_ml: 1500 + ((i * 137) % 1100) });
    seedFoods.slice(0, 3 + (i % 4)).forEach(([fid, qty, slot]) => {
      const f = foodById(fid)!;
      logs.push({
        user_id: userId,
        day,
        food_id: fid,
        name: f.name,
        qty,
        slot,
        nutrition: scale(f.per, qty) as unknown as Record<string, number>,
        at: d.toISOString(),
      });
    });
  }
  return { logs, water };
};

interface Ctx extends State {
  ready: boolean;
  targets: Targets | null;
  today: DayLog;
  totals: Nutrition;
  setProfile: (p: Profile) => void;
  addEntry: (foodId: string, qty: number, slot: MealSlot, name?: string, nu?: Nutrition) => void;
  addEntryOn: (
    date: string,
    foodId: string,
    qty: number,
    slot: MealSlot,
    name?: string,
    nu?: Nutrition,
  ) => void;
  updateEntry: (date: string, id: string, patch: { qty?: number; slot?: MealSlot }) => void;
  removeEntry: (id: string, date?: string) => void;
  addWater: (ml: number) => void;
  setWaterOn: (date: string, ml: number) => void;
  dayLog: (date: string) => DayLog;
  dismissAlert: (id: string) => void;
  reset: () => void;
  streak: number;
  hydrationStreak: number;
  hydrationWeek: { date: string; met: boolean }[];
}

const StoreContext = createContext<Ctx | null>(null);

export function FoodFitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (uid: string) => {
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const sinceKey = todayKey(since);

    const [profileRes, logsRes, waterRes, weightsRes, dismissRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", uid).gte("day", sinceKey),
      supabase.from("day_water").select("*").eq("user_id", uid).gte("day", sinceKey),
      supabase.from("weights").select("*").eq("user_id", uid).order("day"),
      supabase.from("alert_dismissals").select("*").eq("user_id", uid).gte("day", sinceKey),
    ]);

    const days: Record<string, DayLog> = {};
    const ensure = (date: string): DayLog =>
      (days[date] ??= { date, entries: [], waterMl: 0 });

    for (const r of logsRes.data ?? []) {
      ensure(r.day).entries.push({
        id: r.id,
        foodId: r.food_id,
        name: r.name,
        qty: Number(r.qty),
        slot: r.slot as MealSlot,
        nutrition: (r.nutrition ?? { ...EMPTY }) as unknown as Nutrition,
        at: new Date(r.at).getTime(),
      });
    }
    for (const r of waterRes.data ?? []) ensure(r.day).waterMl = r.water_ml ?? 0;
    for (const d of Object.values(days)) d.entries.sort((a, b) => a.at - b.at);

    const dismissed: Record<string, string[]> = {};
    for (const r of dismissRes.data ?? []) (dismissed[r.day] ??= []).push(r.alert_id);

    setState({
      profile: profileRes.data ? rowToProfile(profileRes.data as ProfileRow) : null,
      days,
      weights: (weightsRes.data ?? []).map((w) => ({ date: w.day, kg: Number(w.kg) })),
      dismissed,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setState(EMPTY_STATE);
      setReady(false);
      return;
    }
    setReady(false);
    load(userId).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  const key = todayKey();
  const today: DayLog = state.days[key] ?? { date: key, entries: [], waterMl: 0 };

  const setProfile = useCallback(
    (p: Profile) => {
      if (!userId) return;
      const first = !state.profile;
      setState((s) => ({
        ...s,
        profile: p,
        weights: (() => {
          const rest = s.weights.filter((w) => w.date !== todayKey());
          return [...rest, { date: todayKey(), kg: p.weightKg }];
        })(),
      }));
      void (async () => {
        await supabase.from("profiles").upsert({
          user_id: userId,
          name: p.name,
          age: p.age,
          sex: p.sex,
          height_cm: p.heightCm,
          weight_kg: p.weightKg,
          activity: p.activity,
          pref: p.pref,
          goal: p.goal,
          target_weight_kg: p.targetWeightKg ?? null,
          budget: p.budget ?? null,
          lang: p.lang,
          onboarded: true,
        });
        await supabase
          .from("weights")
          .upsert({ user_id: userId, day: todayKey(), kg: p.weightKg });
        if (first) {
          const { logs, water } = seedRows(userId);
          await Promise.all([
            supabase.from("food_logs").insert(logs),
            supabase.from("day_water").upsert(water),
          ]);
          await load(userId);
        }
      })();
    },
    [userId, state.profile, load],
  );

  const addEntryOn = useCallback(
    (date: string, foodId: string, qty: number, slot: MealSlot, name?: string, nu?: Nutrition) => {
      if (!userId) return;
      const f = foodById(foodId);
      const at = date === todayKey() ? Date.now() : new Date(`${date}T12:00:00`).getTime();
      const entry: LogEntry = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        foodId,
        name: name ?? f?.name ?? "Food",
        qty,
        slot,
        nutrition: nu ?? (f ? scale(f.per, qty) : { ...EMPTY }),
        at,
      };
      setState((s) => {
        const day = s.days[date] ?? { date, entries: [], waterMl: 0 };
        return { ...s, days: { ...s.days, [date]: { ...day, entries: [...day.entries, entry] } } };
      });
      void (async () => {
        const { data } = await supabase
          .from("food_logs")
          .insert({
            user_id: userId,
            day: date,
            food_id: entry.foodId,
            name: entry.name,
            qty: entry.qty,
            slot: entry.slot,
            nutrition: entry.nutrition as unknown as Record<string, number>,
            at: new Date(at).toISOString(),
          })
          .select("id")
          .maybeSingle();
        if (data?.id) {
          setState((s) => {
            const day = s.days[date];
            if (!day) return s;
            return {
              ...s,
              days: {
                ...s.days,
                [date]: {
                  ...day,
                  entries: day.entries.map((e) => (e.id === entry.id ? { ...e, id: data.id } : e)),
                },
              },
            };
          });
        }
      })();
    },
    [userId],
  );

  const addEntry = useCallback(
    (foodId: string, qty: number, slot: MealSlot, name?: string, nu?: Nutrition) =>
      addEntryOn(todayKey(), foodId, qty, slot, name, nu),
    [addEntryOn],
  );

  const updateEntry = useCallback(
    (date: string, id: string, patch: { qty?: number; slot?: MealSlot }) => {
      let next: LogEntry | null = null;
      setState((s) => {
        const day = s.days[date];
        if (!day) return s;
        const entries = day.entries.map((e) => {
          if (e.id !== id) return e;
          const qty = patch.qty != null ? Math.max(0.25, patch.qty) : e.qty;
          const f = foodById(e.foodId);
          const nutrition =
            patch.qty != null && f
              ? scale(f.per, qty)
              : patch.qty != null
                ? scale(scale(e.nutrition, 1 / (e.qty || 1)), qty)
                : e.nutrition;
          next = { ...e, qty, slot: patch.slot ?? e.slot, nutrition };
          return next;
        });
        return { ...s, days: { ...s.days, [date]: { ...day, entries } } };
      });
      if (!userId) return;
      void (async () => {
        const e = next as LogEntry | null;
        if (!e) return;
        await supabase
          .from("food_logs")
          .update({
            qty: e.qty,
            slot: e.slot,
            nutrition: e.nutrition as unknown as Record<string, number>,
          })
          .eq("id", id)
          .eq("user_id", userId);
      })();
    },
    [userId],
  );

  const removeEntry = useCallback(
    (id: string, date?: string) => {
      const k = date ?? todayKey();
      setState((s) => {
        const day = s.days[k];
        if (!day) return s;
        return {
          ...s,
          days: { ...s.days, [k]: { ...day, entries: day.entries.filter((e) => e.id !== id) } },
        };
      });
      if (!userId) return;
      void supabase.from("food_logs").delete().eq("id", id).eq("user_id", userId);
    },
    [userId],
  );

  const setWaterOn = useCallback(
    (date: string, ml: number) => {
      const value = Math.max(0, Math.round(ml));
      setState((s) => {
        const day = s.days[date] ?? { date, entries: [], waterMl: 0 };
        return { ...s, days: { ...s.days, [date]: { ...day, waterMl: value } } };
      });
      if (!userId) return;
      void supabase.from("day_water").upsert({ user_id: userId, day: date, water_ml: value });
    },
    [userId],
  );

  const addWater = useCallback(
    (ml: number) => {
      const k = todayKey();
      const current = state.days[k]?.waterMl ?? 0;
      setWaterOn(k, current + ml);
    },
    [state.days, setWaterOn],
  );

  const dismissAlert = useCallback(
    (id: string) => {
      const k = todayKey();
      setState((s) => {
        const list = s.dismissed[k] ?? [];
        if (list.includes(id)) return s;
        return { ...s, dismissed: { ...s.dismissed, [k]: [...list, id] } };
      });
      if (!userId) return;
      void supabase.from("alert_dismissals").upsert({ user_id: userId, day: k, alert_id: id });
    },
    [userId],
  );

  const reset = useCallback(() => {
    if (!userId) return;
    setState(EMPTY_STATE);
    void (async () => {
      await Promise.all([
        supabase.from("food_logs").delete().eq("user_id", userId),
        supabase.from("day_water").delete().eq("user_id", userId),
        supabase.from("weights").delete().eq("user_id", userId),
        supabase.from("alert_dismissals").delete().eq("user_id", userId),
        supabase.from("profiles").update({ onboarded: false }).eq("user_id", userId),
      ]);
    })();
  }, [userId]);

  const dayLog = useCallback(
    (date: string): DayLog => state.days[date] ?? { date, entries: [], waterMl: 0 },
    [state.days],
  );

  const totals = useMemo(() => sum(today.entries.map((e) => e.nutrition)), [today.entries]);
  const targets = useMemo(
    () => (state.profile ? computeTargets(state.profile) : null),
    [state.profile],
  );

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = state.days[todayKey(d)];
      if (day && day.entries.length > 0) s++;
      else if (i > 0) break;
    }
    return s;
  }, [state.days]);

  const goalMl = (targets?.waterL ?? 2.5) * 1000;

  const hydrationStreak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = state.days[todayKey(d)];
      if (day && day.waterMl >= goalMl) s++;
      else if (i > 0) break;
    }
    return s;
  }, [state.days, goalMl]);

  const hydrationWeek = useMemo(() => {
    const out: { date: string; met: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      out.push({ date: k, met: (state.days[k]?.waterMl ?? 0) >= goalMl });
    }
    return out;
  }, [state.days, goalMl]);

  const value: Ctx = {
    ...state,
    ready,
    targets,
    today,
    totals,
    setProfile,
    addEntry,
    addEntryOn,
    updateEntry,
    removeEntry,
    addWater,
    setWaterOn,
    dayLog,
    dismissAlert,
    reset,
    streak,
    hydrationStreak,
    hydrationWeek,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useFoodFit() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useFoodFit must be used inside FoodFitProvider");
  return ctx;
}
