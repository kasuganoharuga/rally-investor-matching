import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/server/session";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { UserProfilePanel } from "@/features/settings/components/user-profile-panel";

export async function SettingsPage() {
  // A page redirect, not requireUser(): that throws an ApiError meant for
  // API routes, which would surface here as an unhandled exception
  // instead of sending the visitor to sign in.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="settings" user={user} />

      <div className="mx-auto w-full max-w-[720px] space-y-6 px-6 py-7">
        <UserProfilePanel />

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change the password used to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
