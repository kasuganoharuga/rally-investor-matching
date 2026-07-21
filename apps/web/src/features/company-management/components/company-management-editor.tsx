"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ManagedCompany } from "@/features/company-management/types/company-management";
import { CompanyProfileForm } from "@/features/company-profile/components/company-profile-form";
import type { CompanyProfileInput } from "@/features/company-profile/types/company-profile";
import type { ApiError } from "@/lib/api/errors";

type SaveResult = { data: ManagedCompany | null; error: ApiError | null };

export function CompanyManagementEditor({
  company,
  open,
  onClose,
  onSave,
}: {
  company: ManagedCompany;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, input: CompanyProfileInput) => Promise<SaveResult>;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function saveProfile(input: CompanyProfileInput) {
    const result = await onSave(company.id, input);
    return {
      data: result.data?.profile ?? null,
      error: result.error,
    };
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/25" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close company editor"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-editor-title"
        className="absolute top-0 right-0 flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Edit company
            </p>
            <h2
              id="company-editor-title"
              className="truncate text-xl font-semibold text-foreground"
            >
              {company.profile.name}
            </h2>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X aria-hidden="true" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <CompanyProfileForm profile={company.profile} save={saveProfile} />
        </div>
      </section>
    </div>
  );
}
