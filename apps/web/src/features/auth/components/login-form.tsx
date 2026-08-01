"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSafeRedirectTarget } from "@/features/auth/get-safe-redirect-target";
import { useLogin } from "@/features/auth/hooks/use-login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isSubmitting, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { error: loginError } = await login({ email, password });
    if (loginError) {
      return;
    }

    // proxy.ts sends signed-out visitors here with ?from=<original path>
    // so they land back where they meant to go instead of always the app home.
    const redirectTarget = getSafeRedirectTarget(searchParams.get("from"), "/");
    router.push(redirectTarget);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-lg px-4 text-base"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          className="h-11 rounded-lg px-4 text-base"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="h-11 w-full rounded-lg text-sm font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Continue to workspace"}
      </Button>
    </form>
  );
}
