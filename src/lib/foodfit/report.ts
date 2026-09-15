import { healthScore, sum, todayKey } from "./nutrition";
import type { DayLog, Profile, Targets } from "./types";

export interface ReportDay {
  date: string;
  label: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  waterL: number;
  meals: number;
  score: number;
}

export interface WeeklyReport {
  from: string;
  to: string;
  days: ReportDay[];
  avg: Omit<ReportDay, "date" | "label">;
  loggedDays: number;
  weightStart?: number | undefined;
  weightEnd?: number | undefined;
  targets: Targets;
  profile: Profile;
}

const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export function buildWeeklyReport(
  days: Record<string, DayLog>,
  weights: { date: string; kg: number }[],
  targets: Targets,
  profile: Profile,
  now: Date = new Date(),
): WeeklyReport {
  const rows: ReportDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const day = days[key];
    const entries = day?.entries ?? [];
    const n = sum(entries.map((e) => e.nutrition));
    const grams = entries.length * 150;
    rows.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      kcal: n.kcal,
      protein: round(n.protein),
      carbs: round(n.carbs),
      fat: round(n.fat),
      fiber: round(n.fiber, 1),
      sodium: round(n.sodium),
      waterL: round((day?.waterMl ?? 0) / 1000, 2),
      meals: new Set(entries.map((e) => e.slot)).size,
      score: entries.length ? healthScore(n, grams).score : 0,
    });
  }

  const logged = rows.filter((r) => r.kcal > 0);
  const n = Math.max(1, logged.length);
  const avgOf = (k: keyof ReportDay) =>
    round(logged.reduce((a, r) => a + (r[k] as number), 0) / n, 1);

  return {
    from: rows[0]?.date ?? todayKey(now),
    to: rows[rows.length - 1]?.date ?? todayKey(now),
    days: rows,
    avg: {
      kcal: avgOf("kcal"),
      protein: avgOf("protein"),
      carbs: avgOf("carbs"),
      fat: avgOf("fat"),
      fiber: avgOf("fiber"),
      sodium: avgOf("sodium"),
      waterL: avgOf("waterL"),
      meals: avgOf("meals"),
      score: avgOf("score"),
    },
    loggedDays: logged.length,
    weightStart: weights[Math.max(0, weights.length - 2)]?.kg,
    weightEnd: weights[weights.length - 1]?.kg,
    targets,
    profile,
  };
}

const DISCLAIMER =
  "All nutrition values are estimates and may vary with ingredients, preparation, brand and serving size. For general wellness only — not medical or dietary advice.";

export function reportToCSV(r: WeeklyReport): string {
  const lines: string[] = [];
  lines.push(`AI FoodFit weekly nutrition report,${r.from} to ${r.to}`);
  lines.push(`Name,${r.profile.name}`);
  lines.push(`Daily targets,${r.targets.kcal} kcal,${r.targets.protein} g protein,${r.targets.waterL} L water`);
  lines.push("");
  lines.push("Date,Day,Calories (kcal),Protein (g),Carbs (g),Fat (g),Fibre (g),Sodium (mg),Water (L),Meals logged,Health score");
  for (const d of r.days) {
    lines.push(
      [d.date, d.label, d.kcal, d.protein, d.carbs, d.fat, d.fiber, d.sodium, d.waterL, d.meals, d.score].join(","),
    );
  }
  lines.push("");
  lines.push(
    ["Average", "", r.avg.kcal, r.avg.protein, r.avg.carbs, r.avg.fat, r.avg.fiber, r.avg.sodium, r.avg.waterL, r.avg.meals, r.avg.score].join(","),
  );
  lines.push(`Days logged,${r.loggedDays} of 7`);
  if (r.weightStart != null && r.weightEnd != null)
    lines.push(`Weight,${r.weightStart} kg to ${r.weightEnd} kg`);
  lines.push("");
  lines.push(`"${DISCLAIMER}"`);
  return lines.join("\n");
}

export function downloadCSV(r: WeeklyReport) {
  const blob = new Blob([reportToCSV(r)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `foodfit-weekly-${r.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const REPORT_DISCLAIMER = DISCLAIMER;

/** Opens a print-friendly report in a new window and triggers the print dialog (PDF-ready). */
export function printReport(r: WeeklyReport) {
  const rows = r.days
    .map(
      (d) =>
        `<tr><td>${d.label}<span class="muted"> ${d.date.slice(5)}</span></td><td>${d.kcal}</td><td>${d.protein}</td><td>${d.carbs}</td><td>${d.fat}</td><td>${d.fiber}</td><td>${d.waterL}</td><td>${d.meals}</td><td>${d.score || "—"}</td></tr>`,
    )
    .join("");
  const weight =
    r.weightStart != null && r.weightEnd != null
      ? `<p>Weight: ${r.weightStart} kg → ${r.weightEnd} kg</p>`
      : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>AI FoodFit weekly report ${r.to}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1f2421;margin:32px;}
  h1{font-size:20px;margin:0 0 4px;} h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em;color:#4b5a52;}
  table{width:100%;border-collapse:collapse;font-size:12px;} th,td{border-bottom:1px solid #e3e8e4;padding:6px 4px;text-align:right;}
  th:first-child,td:first-child{text-align:left;} .muted{color:#8a978f;} .cards{display:flex;gap:12px;flex-wrap:wrap;}
  .card{border:1px solid #e3e8e4;border-radius:10px;padding:10px 14px;font-size:12px;} .card b{display:block;font-size:16px;}
  .note{margin-top:24px;font-size:11px;color:#6b7a71;line-height:1.5;}
</style></head><body>
<h1>AI FoodFit — Weekly Nutrition Report</h1>
<p class="muted">${r.profile.name} · ${r.from} to ${r.to} · Targets ${r.targets.kcal} kcal, ${r.targets.protein} g protein, ${r.targets.waterL} L water</p>
<h2>Weekly averages</h2>
<div class="cards">
  <div class="card">Calories<b>${r.avg.kcal} kcal</b></div>
  <div class="card">Protein<b>${r.avg.protein} g</b></div>
  <div class="card">Fibre<b>${r.avg.fiber} g</b></div>
  <div class="card">Water<b>${r.avg.waterL} L</b></div>
  <div class="card">Health score<b>${r.avg.score}/100</b></div>
  <div class="card">Days logged<b>${r.loggedDays}/7</b></div>
</div>
${weight}
<h2>Daily detail</h2>
<table><thead><tr><th>Day</th><th>kcal</th><th>Protein g</th><th>Carbs g</th><th>Fat g</th><th>Fibre g</th><th>Water L</th><th>Meals</th><th>Score</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="note">${DISCLAIMER}</p>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
