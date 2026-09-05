"use client";

import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Route-level safety net. Without this file any uncaught error in a server
 * component — a stale `?rematch=` id, a repository call against a record that
 * has since been deleted, a transient database blip — replaced the entire app
 * with Next's default error screen, which offers the user no way back.
 *
 * `error.tsx` cannot catch a throw from the root layout itself; that would
 * need a `global-error.tsx`. Everything below the layout lands here.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe correlator: Next strips the real message in
    // production, and the raw message can carry record ids or SQL detail.
    console.error("app_route_error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight">Something went wrong</h1>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
          This page could not be loaded. Your saved matches and company profile are
          unaffected — try again, or head back to your workspace.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        {/* Deliberately a plain anchor rather than next/link: a soft
            client-side navigation keeps the router state that just errored,
            so a broken RSC payload would simply re-throw. A full document
            load is the escape hatch. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/match" className={cn(buttonVariants({ variant: "secondary" }))}>
          Back to workspace
        </a>
      </div>
    </main>
  );
}
