"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_COMPANY_PROFILE_FORM_VALUES,
  toCompanyProfileFormValues,
  toCompanyProfileInput,
  type CompanyProfile,
  type CompanyProfileFormValues,
  type CompanyProfileInput,
} from "@/features/company-profile/types/company-profile";
import type { ApiError } from "@/lib/api/errors";

type CompanyProfileFormProps = {
  profile: CompanyProfile | null;
  save: (
    input: CompanyProfileInput,
  ) => Promise<{ data: CompanyProfile | null; error: ApiError | null }>;
};

/**
 * Plain-string RHF state (no zodResolver): CompanyProfileFormValues has
 * no nulls/numbers, so a resolver driven by companyProfileInputSchema
 * would fight React Hook Form's own types. Validation instead happens
 * once, explicitly, in onSubmit via toCompanyProfileInput().
 */
export function CompanyProfileForm({ profile, save }: CompanyProfileFormProps) {
  const form = useForm<CompanyProfileFormValues>({
    defaultValues: EMPTY_COMPANY_PROFILE_FORM_VALUES,
  });
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // GET resolves after mount, and a successful save returns a fresh
  // profile (updatedAt/hqAddressFull included) — RHF's defaultValues are
  // cached at mount time, so both cases need an explicit reset to reach
  // the form.
  useEffect(() => {
    form.reset(toCompanyProfileFormValues(profile));
  }, [profile, form]);

  async function onSubmit(values: CompanyProfileFormValues) {
    form.clearErrors();
    setSaveError(null);
    setSavedAt(null);

    let input: CompanyProfileInput;
    try {
      input = toCompanyProfileInput(values);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const field = issue.path[0];
          if (typeof field === "string" && field in EMPTY_COMPANY_PROFILE_FORM_VALUES) {
            form.setError(field as keyof CompanyProfileFormValues, {
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
      form.reset(toCompanyProfileFormValues(result.data));
      setSavedAt(result.data.updatedAt);
    }
  }

  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="company-name">Company name</FieldLabel>
          <Input
            id="company-name"
            required
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.oneLiner}>
          <FieldLabel htmlFor="company-one-liner">One-liner</FieldLabel>
          <Input
            id="company-one-liner"
            placeholder="One-sentence positioning shown on match cards"
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.oneLiner}
            {...form.register("oneLiner")}
          />
          <FieldError errors={[errors.oneLiner]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="company-description">Description</FieldLabel>
          <Textarea
            id="company-description"
            rows={5}
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.description}
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.websiteUrl}>
            <FieldLabel htmlFor="company-website">Website URL</FieldLabel>
            <Input
              id="company-website"
              type="url"
              placeholder="https://example.com"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.websiteUrl}
              {...form.register("websiteUrl")}
            />
            <FieldError errors={[errors.websiteUrl]} />
          </Field>

          <Field data-invalid={!!errors.linkedinUrl}>
            <FieldLabel htmlFor="company-linkedin">LinkedIn URL</FieldLabel>
            <Input
              id="company-linkedin"
              type="url"
              placeholder="https://www.linkedin.com/company/..."
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.linkedinUrl}
              {...form.register("linkedinUrl")}
            />
            <FieldError errors={[errors.linkedinUrl]} />
          </Field>
        </div>

        <Field className="sm:w-56" data-invalid={!!errors.foundedYear}>
          <FieldLabel htmlFor="company-founded-year">Founded year</FieldLabel>
          <Input
            id="company-founded-year"
            inputMode="numeric"
            placeholder="2024"
            disabled={form.formState.isSubmitting}
            aria-invalid={!!errors.foundedYear}
            {...form.register("foundedYear")}
          />
          <FieldError errors={[errors.foundedYear]} />
        </Field>

        <FieldDescription className="-mb-2">Headquarters</FieldDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.hqCountry}>
            <FieldLabel htmlFor="company-hq-country">Country</FieldLabel>
            <Input
              id="company-hq-country"
              placeholder="AU"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.hqCountry}
              {...form.register("hqCountry")}
            />
            <FieldError errors={[errors.hqCountry]} />
          </Field>
          <Field data-invalid={!!errors.hqState}>
            <FieldLabel htmlFor="company-hq-state">State</FieldLabel>
            <Input
              id="company-hq-state"
              placeholder="NSW"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.hqState}
              {...form.register("hqState")}
            />
            <FieldError errors={[errors.hqState]} />
          </Field>
          <Field data-invalid={!!errors.hqCity}>
            <FieldLabel htmlFor="company-hq-city">City</FieldLabel>
            <Input
              id="company-hq-city"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.hqCity}
              {...form.register("hqCity")}
            />
            <FieldError errors={[errors.hqCity]} />
          </Field>
          <Field data-invalid={!!errors.hqPostalCode}>
            <FieldLabel htmlFor="company-hq-postal-code">Postal code</FieldLabel>
            <Input
              id="company-hq-postal-code"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.hqPostalCode}
              {...form.register("hqPostalCode")}
            />
            <FieldError errors={[errors.hqPostalCode]} />
          </Field>
          <Field className="sm:col-span-2" data-invalid={!!errors.hqStreet}>
            <FieldLabel htmlFor="company-hq-street">Street</FieldLabel>
            <Input
              id="company-hq-street"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!errors.hqStreet}
              {...form.register("hqStreet")}
            />
            <FieldError errors={[errors.hqStreet]} />
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
