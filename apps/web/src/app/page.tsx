import Image from "next/image";

import { Button } from "@/components/ui/button";
import { InvestorListPanel } from "@/features/investors";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-primary text-primary-foreground">
      <section
        className="relative isolate mx-auto flex min-h-screen w-full max-w-7xl flex-col py-8"
        style={{
          paddingLeft: "clamp(2rem, 5vw, 3.5rem)",
          paddingRight: "clamp(2rem, 5vw, 3.5rem)",
        }}
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(234,255,91,0.32),transparent_24rem),radial-gradient(circle_at_82%_34%,rgba(255,255,255,0.16),transparent_26rem),linear-gradient(135deg,#073127_0%,#031d17_100%)]" />
        <header className="flex items-center justify-between">
          <Image
            src="/brand/rally-icon.png"
            alt="Rally"
            width={96}
            height={96}
            priority
            className="size-12 rounded-2xl object-cover ring-1 ring-white/12 sm:size-14"
          />
          <Button variant="secondary" size="lg" className="shadow-sm">
            MVP Foundation
          </Button>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-16 py-14">
          <div className="max-w-4xl text-white">
            <p className="mb-5 inline-flex rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-secondary-foreground">
              Rally Investor Matching
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.07em] sm:text-7xl lg:text-8xl xl:text-9xl">
              Match founders with investors that actually fit.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-white/78 sm:text-xl">
              A focused foundation for founder intake, investor validation, AI-assisted
              matching, and a CRM-style shortlist.
            </p>
          </div>

          <InvestorListPanel />
        </div>
      </section>
    </main>
  );
}
