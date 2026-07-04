import Image from "next/image";
import Link from "next/link";

import { MatchingWorkspace } from "@/features/matching/components/matching-workspace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MatchingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/rally-icon.png"
              alt="Rally"
              width={48}
              height={48}
              priority
              className="size-10 rounded-lg object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Rally</p>
              <p className="text-xs text-muted-foreground">Investor Matching</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <span
              aria-current="page"
              className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}
            >
              Workspace
            </span>
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground",
              )}
            >
              Company Profile
            </span>
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground",
              )}
            >
              Settings
            </span>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Investor database
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 py-5">
        <MatchingWorkspace />
      </div>
    </main>
  );
}
