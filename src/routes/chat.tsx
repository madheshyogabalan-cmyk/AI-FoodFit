import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import AppShell from "@/components/foodfit/AppShell";
import { Chip } from "@/components/foodfit/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assistantReply, SUGGESTED_QUESTIONS } from "@/lib/foodfit/ai";
import { useFoodFit } from "@/lib/foodfit/store";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "FoodFit AI Nutrition Assistant — AI FoodFit" },
      {
        name: "description",
        content:
          "Ask FoodFit AI about calories, protein, budget meals and Tamil food questions — answers use your profile and today's log.",
      },
      { property: "og:title", content: "FoodFit AI Assistant" },
      {
        property: "og:description",
        content: "General wellness nutrition guidance in English and Tamil, based on your tracked food.",
      },
    ],
  }),
  component: ChatPage,
});

interface Msg {
  id: number;
  role: "user" | "ai";
  text: string;
}

function ChatPage() {
  return (
    <AppShell title="FoodFit AI" subtitle="English · தமிழ் · Tanglish">
      <Assistant />
    </AppShell>
  );
}

function Assistant() {
  const { profile, targets, totals } = useFoodFit();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setMsgs([
        {
          id: 0,
          role: "ai",
          text: `Hi ${profile.name}! I'm FoodFit AI. Ask me about any food, your daily numbers, or a budget meal idea. I answer in English, Tamil or Tanglish — all values are estimates.`,
        },
      ]);
    }
  }, [profile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  if (!profile || !targets) return null;

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setInput("");
    setTyping(true);
    const reply = assistantReply(q, profile, targets, totals);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: Date.now() + 1, role: "ai", text: reply }]);
      setTyping(false);
    }, 700);
  };

  return (
    <div className="space-y-4">
      <div className="card-soft min-h-[50vh] space-y-3 p-4">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[88%] rounded-2xl p-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="w-20 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">…</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((s) => (
          <Chip key={s} onClick={() => send(s)} className="text-xs">
            {s}
          </Chip>
        ))}
      </div>

      <div className="sticky bottom-20 flex gap-2 rounded-2xl bg-background/90 py-2 backdrop-blur">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask FoodFit AI…"
        />
        <Button onClick={() => send(input)} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        FoodFit AI shares general wellness information only. For medical conditions, medication or a
        personalised clinical diet, please consult a qualified healthcare professional.
      </p>
    </div>
  );
}
