"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_USER_PROFILE_FORM_VALUES,
  toUserProfileFormValues,
  toUserProfileInput,
  type UserProfile,
  type UserProfileFormValues,
  type UserProfileInput,
} from "@/features/settings/types/user-profile";
import type { ApiError } from "@/lib/api/errors";

type UserProfileFormProps = {
  profile: UserProfile | null;
  save: (
    input: UserProfileInput,
  ) => Promise<{ data: UserProfile | null; error: ApiError | null }>;
};

/**
 * Plain-string RHF state (no zodResolver), mirroring
 * CompanyProfileForm — see that component for the full rationale.
 */
export function UserProfileForm({ profile, save }: UserProfileFormProps) {
  const form = useForm<UserProfileFormValues>({
    defaultValues: EMPTY_USER_PROFILE_FORM_VALUES,
  });
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    form.reset(toUserProfileFormValues(profile));
  }, [profile, form]);

  async function onSubmit(values: UserProfileFormValues) {
    form.clearErrors();
    setSaveError(null);
    setSavedAt(null);

    let input: UserProfileInput;
    try {
      input = toUserProfileInput(values);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const field = issue.path[0];
          if (typeof field === "string" && field in EMPTY_USER_PROFILE_FORM_VALUES) {
            form.setError(field as keyof UserProfileFormValues, {
              type: "validate",
              message: issue.message,
            });
          }
        }
        return;
      }
      throw error;
    }

    const result = await save(input);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    if (result.data) {
      form.reset(toUserProfileFormValues(result.data));
      setSavedAt(result.data.updatedAt);
    }
  }

  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="profile-first-name">First name</FieldLabel>
            <Input
              id="profile-first-name"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.firstName}
              {...form.register("firstName")}
            />
            <FieldError errors={[errors.firstName]} />
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
            <Input
              id="profile-last-name"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.lastName}
              {...form.register("lastName")}
            />
            <FieldError errors={[errors.lastName]} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.linkedinUrl}>
            <FieldLabel htmlFor="profile-linkedin">LinkedIn URL</FieldLabel>
            <Input
              id="profile-linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.linkedinUrl}
              {...form.register("linkedinUrl")}
            />
            <FieldError errors={[errors.linkedinUrl]} />
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
            <Input
              id="profile-phone"
              type="tel"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
            <FieldError errors={[errors.phone]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.roleAtCompany}>
          <FieldLabel htmlFor="profile-role">Role</FieldLabel>
          <Input
            id="profile-role"
            placeholder="Founder, CEO, CTO, Operator..."
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.roleAtCompany}
            {...form.register("roleAtCompany")}
          />
          <FieldError errors={[errors.roleAtCompany]} />
        </Field>

        <Field data-invalid={!!errors.bio}>
          <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
          <Textarea
            id="profile-bio"
            rows={4}
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.bio}
            {...form.register("bio")}
          />
          <FieldError errors={[errors.bio]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.country}>
            <FieldLabel htmlFor="profile-country">Country</FieldLabel>
            <Input
              id="profile-country"
              placeholder="AU"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.country}
              {...form.register("country")}
            />
            <FieldError errors={[errors.country]} />
          </Field>
          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="profile-state">State</FieldLabel>
            <Input
              id="profile-state"
              placeholder="NSW"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.state}
              {...form.register("state")}
            />
            <FieldError errors={[errors.state]} />
          </Field>
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor="profile-city">City</FieldLabel>
            <Input
              id="profile-city"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.city}
              {...form.register("city")}
            />
            <FieldError errors={[errors.city]} />
          </Field>
        </div>
      </FieldGroup>

      {saveError ? (
        <p className="text-sm text-destructive">{saveError.message}</p>
      ) : null}
      {!saveError && savedAt ? (
        <p className="text-sm text-muted-foreground">Saved.</p>
      ) : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
