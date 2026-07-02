import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { InvestorListPanel } from "@/features/investors";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
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
          <div className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Database
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-5 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Investors
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Database</h1>
          </div>
          <Link href="/match" className={buttonVariants({ size: "lg" })}>
            <MessageCircle aria-hidden="true" />
            Open matching chat
          </Link>
        </div>
        <InvestorListPanel />
      </div>
    </main>
  );
}
