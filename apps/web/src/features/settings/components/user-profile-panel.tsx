"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { useUserProfile } from "@/features/settings/hooks/use-user-profile";

export function UserProfilePanel() {
  const { profile, isLoading, error, reload, save } = useUserProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your personal details — name, contact info, and role.
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
          <UserProfileForm profile={profile} save={save} />
        ) : null}
      </CardContent>
    </Card>
  );
}
