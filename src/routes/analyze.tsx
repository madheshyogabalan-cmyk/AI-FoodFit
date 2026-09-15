import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, Search, Zap } from "lucide-react";
import AppShell from "@/components/foodfit/AppShell";
import NutritionResult from "@/components/foodfit/NutritionResult";
import { Chip, SectionTitle } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FOODS, parseQuery, searchFoods } from "@/lib/foodfit/foods";
import { simulateImageRecognition, type Detection } from "@/lib/foodfit/ai";
import type { FoodItem } from "@/lib/foodfit/types";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze Food — AI FoodFit" },
      {
        name: "description",
        content:
          "Search a food, upload a photo for simulated AI recognition, or quick-add common Indian foods for estimated nutrition.",
      },
      { property: "og:title", content: "Analyze Food — AI FoodFit" },
      {
        property: "og:description",
        content: "Estimated calories, macros, sodium and a 0–100 health score for any food.",
      },
    ],
  }),
  component: AnalyzePage,
});

type Tab = "search" | "image" | "quick";

function AnalyzePage() {
  return (
    <AppShell title="Analyze Food" subtitle="Search, photo, or quick add">
      <Analyzer />
    </AppShell>
  );
}

function Analyzer() {
  const [tab, setTab] = useState<Tab>("search");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cleaned = q.replace(/\d+(\.\d+)?\s*(g|gram|grams|gm|x)?/gi, " ").trim();
  const results = searchFoods(cleaned || q);


  const choose = (f: FoodItem, quantity = 1) => {
    setSelected(f);
    setQty(quantity);
  };

  const runSearch = () => {
    const parsed = parseQuery(q);
    if (parsed) choose(parsed.food, Math.round(parsed.qty * 100) / 100);
  };

  const onFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImage(url);
    setBusy(true);
    setDetections(null);
    setSelected(null);
    const d = await simulateImageRecognition(file.name + file.size);
    setDetections(d);
    setBusy(false);
    if (d[0]) choose(d[0].food, 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            { v: "search" as Tab, l: "Search", i: Search },
            { v: "image" as Tab, l: "Photo", i: Camera },
            { v: "quick" as Tab, l: "Quick Add", i: Zap },
          ]
        ).map(({ v, l, i: Icon }) => (
          <Chip key={v} active={tab === v} onClick={() => setTab(v)} className="flex-1">
            <span className="flex items-center justify-center gap-1.5">
              <Icon className="size-4" /> {l}
            </span>
          </Chip>
        ))}
      </div>

      {tab === "search" && (
        <section className="card-soft p-5">
          <SectionTitle>Search food</SectionTitle>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder='e.g. "2 Idli" or "100g Chicken Breast"'
            />
            <Button onClick={runSearch}>Analyze</Button>
          </div>
          {q && results.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {results.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    const parsed = parseQuery(q);
                    choose(f, parsed?.food.id === f.id ? Math.round(parsed.qty * 100) / 100 : 1);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-secondary"
                >
                  <span className="text-lg">{f.emoji}</span>
                  <span className="flex-1 text-sm font-medium">{f.name}</span>
                  <span className="text-num text-xs text-muted-foreground">{f.per.kcal} kcal</span>
                </button>
              ))}
            </div>
          )}
          {q && results.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              No match in the sample database yet — try idli, dosa, biryani, paneer, egg…
            </p>
          )}
        </section>
      )}

      {tab === "image" && (
        <section className="card-soft p-5">
          <SectionTitle>Upload or capture a food photo</SectionTitle>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {image ? (
            <img
              src={image}
              alt="Uploaded food for AI analysis"
              className="h-48 w-full rounded-2xl object-cover"
            />
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
            >
              <Camera className="size-6" />
              Tap to upload or take a photo
            </button>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {image ? "Choose another" : "Choose image"}
            </Button>
          </div>

          {busy && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Simulated AI is recognising the food…
            </p>
          )}
          {detections && (
            <div className="mt-4">
              <p className="text-sm font-semibold">
                Detected: {detections[0]?.food.name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({Math.round((detections[0]?.confidence ?? 0) * 100)}% confidence, simulated)
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirm or pick a different item before calculating nutrition.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {detections.map((d) => (
                  <Chip key={d.food.id} active={selected?.id === d.food.id} onClick={() => choose(d.food)}>
                    {d.food.emoji} {d.food.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "quick" && (
        <section className="card-soft p-5">
          <SectionTitle>Quick add common foods</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {FOODS.slice(0, 18).map((f) => (
              <button
                key={f.id}
                onClick={() => choose(f)}
                className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center hover:bg-secondary"
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-[11px] font-medium leading-tight">{f.name}</span>
                <span className="text-num text-[10px] text-muted-foreground">{f.per.kcal} kcal</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <NutritionResult
          food={selected}
          qty={qty}
          onQtyChange={setQty}
          onSelectFood={(f) => choose(f)}
        />
      )}
    </div>
  );
}
