"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrationInputSchema } from "@/features/auth/types/registration";
import { apiFetch } from "@/lib/api/client";

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = registrationInputSchema.safeParse(
      Object.fromEntries(
        Array.from(form.entries()).filter(([key]) => key !== "confirmPassword"),
      ),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    if (parsed.data.password !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch<{ email: string }>("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      // The account can't sign in yet — it needs the verification email
      // (sent as part of creating it) confirmed first, so there's nothing
      // to redirect to here.
      setAccountCreated(true);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (accountCreated) {
    return (
      <div className="space-y-4" role="status">
        <p>
          Your account is ready. We&apos;ve sent a confirmation link to your email —
          open it to verify your address and sign in to your Workspace.
        </p>
        <Link href="/" className="font-semibold underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset disabled={isSubmitting} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="organisation">Organisation name</Label>
          <Input
            id="organisation"
            name="organisation"
            autoComplete="organization"
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">Your LinkedIn profile</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            placeholder="https://www.linkedin.com/in/your-name"
            maxLength={500}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Leave this empty</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </fieldset>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-muted-foreground">
        We use these details to set up your founder account and company profile. Your
        registration details are not added to the public investor directory. We&apos;ll
        email you a link to confirm your address before you can sign in.
      </p>
      <Button
        type="submit"
        variant="secondary"
        className="h-11 w-full font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating your account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
