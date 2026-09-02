import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegistrationForm } from "@/features/auth/components/registration-form";
import { getCurrentUser } from "@/features/auth/server/session";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/match");
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[0.8fr_1.2fr]">
      <section className="flex flex-col justify-between bg-primary px-6 py-8 text-primary-foreground sm:px-12 lg:p-16">
        <Link href="/" className="flex w-fit items-center gap-2">
          <Image
            src="/brand/rally-icon.png"
            alt="Rally"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-bold tracking-wide">RALLY</span>
        </Link>
        <div className="mt-12 max-w-md space-y-6 lg:my-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-secondary uppercase">
            Investor Matching
          </p>
          <h1 className="font-serif text-4xl leading-tight lg:text-5xl">
            Find the investors who fit your next round.
          </h1>
          <p className="leading-7 text-primary-foreground/75">
            Create your founder account, tell us about your company, and build a
            shortlist backed by real deal evidence.
          </p>
          <ol className="space-y-3 text-sm">
            <li>01 &nbsp; Set up your account</li>
            <li>02 &nbsp; Start in your Workspace</li>
            <li>03 &nbsp; Explore your investor matches</li>
          </ol>
        </div>
        <p className="mt-8 text-xs text-primary-foreground/60">
          Already invited? You can also use the invitation link in your email.
        </p>
      </section>
      <section className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-12 lg:py-14">
        <div className="mb-7 space-y-2">
          <h2 className="text-2xl font-semibold">Create your account</h2>
          <p className="text-sm text-muted-foreground">
            A few details to get your Workspace ready. All fields are required.
          </p>
        </div>
        <RegistrationForm />
      </section>
    </main>
  );
}
