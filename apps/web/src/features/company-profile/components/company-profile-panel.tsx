"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompanyProfileForm } from "@/features/company-profile/components/company-profile-form";
import { useCompanyProfile } from "@/features/company-profile/hooks/use-company-profile";

export function CompanyProfilePanel() {
  const { profile, isLoading, error, reload, save } = useCompanyProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <CardDescription>
          Your company&apos;s identity — name, website, and headquarters. Shown to
          investors as part of every match.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
        {!isLoading && error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void reload()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {!isLoading && !error ? (
          <CompanyProfileForm profile={profile} save={save} />
        ) : null}
      </CardContent>
    </Card>
  );
}
