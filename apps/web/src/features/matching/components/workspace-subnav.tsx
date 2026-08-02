"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function WorkspaceSubnav({ recordCount }: { recordCount?: number }) {
  const pathname = usePathname();
  const isHistory = pathname?.startsWith("/match/history") ?? false;
  const isNewMatch = pathname === "/match";

  const tabs = [
    { href: "/match", label: "New match", active: isNewMatch },
    { href: "/match/history", label: "Match history", active: isHistory },
  ] as const;

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-7 px-5 md:px-7">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "py-4 text-sm font-semibold transition",
              tab.active
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.label === "Match history" && recordCount ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({recordCount})
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
