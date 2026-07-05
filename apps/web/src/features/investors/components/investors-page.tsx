import Image from "next/image";
import Link from "next/link";

import { InvestorListPanel } from "@/features/investors/components/investor-list-panel";

export function InvestorsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/brand/rally-icon.png"
                alt="Rally"
                width={34}
                height={34}
                priority
                className="size-8 rounded-md object-cover"
              />
              <span className="text-sm font-bold tracking-wide text-foreground">
                RALLY
              </span>
            </Link>
            <Link
              href="/match"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Workspace
            </Link>
            <span
              aria-current="page"
              className="border-b-2 border-primary py-5 text-sm font-semibold text-foreground"
            >
              Investors
            </span>
            <span className="text-sm font-medium text-muted-foreground">Account</span>
          </nav>
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            JD
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-6 py-7">
        <InvestorListPanel />
      </div>
    </main>
  );
}
