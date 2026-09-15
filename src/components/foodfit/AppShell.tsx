import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, Home, Salad, ScanSearch, TrendingUp, User } from "lucide-react";
import type { ReactNode } from "react";
import Onboarding from "./Onboarding";
import { Disclaimer } from "./bits";
import { useFoodFit } from "@/lib/foodfit/store";
import { t } from "@/lib/foodfit/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", icon: Home, key: "home" as const },
  { to: "/analyze", icon: ScanSearch, key: "analyze" as const },
  { to: "/meals", icon: Salad, key: "mealPlan" as const },
  { to: "/progress", icon: TrendingUp, key: "progress" as const },
  { to: "/chat", icon: Bot, key: "assistant" as const },
  { to: "/profile", icon: User, key: "profile" as const },
];

export default function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { profile, ready } = useFoodFit();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!profile) return <Onboarding />;

  const lang = profile.lang;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
            🌿 AI FoodFit
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-4">
        {children}
        <Disclaimer text={t("disclaimer", lang)} />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-1 py-1.5">
          {NAV.map(({ to, icon: Icon, key }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                <span className="truncate">{t(key, lang)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
