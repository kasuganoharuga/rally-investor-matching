import Image from "next/image";
import Link from "next/link";
import { LockIcon } from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";

const VALUE_PROPS = [
  {
    title: "A shortlist scored against real deal evidence",
    description:
      "Not a guess — every match is backed by portfolio history, stage fit, and check size.",
  },
  {
    title: "Match reasons you can defend in an intro email",
    description:
      "See exactly why an investor fits before you spend a warm intro on them.",
  },
  {
    title: "Deal history for every recommendation",
    description:
      "Comparable rounds, sectors, and geography — not just a name and a logo.",
  },
  {
    title: "Warm-intro signals, ranked",
    description: "Know who's most likely to say yes before you send the first message.",
  },
] as const;

export function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between gap-12 px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/rally-icon.png"
            alt="Rally"
            width={30}
            height={30}
            priority
            className="size-7 rounded-md object-cover"
          />
          <span className="text-sm font-bold tracking-wide text-foreground">RALLY</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl leading-tight text-foreground">
              Pick up where you left off
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to see your shortlist and matching progress.
            </p>
          </div>
          <LoginForm />
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockIcon className="size-3.5" aria-hidden="true" />
          Access is invite-only. Seats are assigned per cohort.
        </p>
      </div>

      <div className="hidden flex-col justify-between bg-primary px-16 py-12 text-primary-foreground lg:flex">
        <p className="text-xs font-semibold tracking-[0.2em] text-secondary uppercase">
          Rally &middot; Investor Matching
        </p>

        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="font-serif text-4xl leading-tight">
              Every founder thinks their raise is ready. This is how you find out who
              agrees.
            </h2>
            <p className="text-sm text-primary-foreground/70">
              We match your company against real deal history — stage, sector,
              geography, and check size — so outreach goes to investors who actually say
              yes.
            </p>
          </div>

          <div className="border-t border-primary-foreground/15" />

          <ol className="space-y-6">
            {VALUE_PROPS.map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="font-mono text-sm text-secondary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm text-primary-foreground/60">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs tracking-[0.2em] text-primary-foreground/40 uppercase">
          Invite only &middot; By cohort
        </p>
      </div>
    </main>
  );
}
