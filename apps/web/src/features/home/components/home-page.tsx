import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Database, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { AccountMenu } from "@/features/auth/components/account-menu";
import type { UserRole } from "@/features/auth/types/auth";

type HomePageProps = {
  user: { email: string; role: UserRole };
};

function ActionTile({
  href,
  title,
  description,
  icon,
  featured,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        featured
          ? "group flex items-center gap-5 rounded-lg bg-[#eaff5b] p-5 text-[#073127] shadow-xl shadow-black/15 transition hover:bg-[#eaff5b]/90"
          : "group flex items-center gap-5 rounded-lg border border-white/20 bg-white/10 p-5 text-white shadow-xl shadow-black/10 transition hover:border-secondary/70 hover:bg-white/15"
      }
    >
      <span
        className={
          featured
            ? "flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#073127] text-[#eaff5b]"
            : "flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#eaff5b] text-[#073127]"
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span
          className={
            featured
              ? "mt-1 block text-sm leading-6 text-[#073127]/80"
              : "mt-1 block text-sm leading-6 text-white/75"
          }
        >
          {description}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" />
    </Link>
  );
}

export function HomePage({ user }: HomePageProps) {
  return (
    <main className="dark relative min-h-screen overflow-hidden bg-[#053b30] text-white">
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/rally-icon.png"
              alt="Rally"
              width={30}
              height={30}
              priority
              className="size-8 rounded-md object-cover"
            />
            <span className="text-sm font-bold tracking-wide text-white">RALLY</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/match"
              className="text-sm font-semibold text-white/85 transition hover:text-white"
            >
              Matching
            </Link>
            <Link
              href="/investors"
              className="text-sm font-semibold text-white/85 transition hover:text-white"
            >
              Database
            </Link>
            <AccountMenu email={user.email} role={user.role} />
          </nav>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[22%] left-1/2 hidden -translate-x-1/2 text-[18vw] font-black leading-none tracking-normal text-white/[0.055] lg:block"
      >
        RALLY
      </div>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-[1280px] items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[#eaff5b]/50 bg-[#eaff5b] px-4 py-1.5 text-xs font-semibold text-[#073127] shadow-sm">
            Investor intelligence workspace
          </span>
          <h1 className="mt-6 text-6xl font-semibold leading-none tracking-normal text-white md:text-7xl">
            RALLY
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
            Match early-stage founders with evidence-backed investors, then inspect
            the database behind every recommendation.
          </p>
        </div>

        <div className="grid gap-3">
          <ActionTile
            href="/match"
            title="Matching"
            description="Build a founder profile and rank the best-fit investor paths."
            icon={<Sparkles className="size-5" aria-hidden="true" />}
            featured
          />
          <ActionTile
            href="/investors"
            title="Database"
            description="Browse reviewed investors, focus areas, deals, and contact signals."
            icon={<Database className="size-5" aria-hidden="true" />}
          />
        </div>
      </section>
    </main>
  );
}
