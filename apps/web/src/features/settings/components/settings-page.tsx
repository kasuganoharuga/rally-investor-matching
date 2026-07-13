import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { UserProfilePanel } from "@/features/settings/components/user-profile-panel";

export async function SettingsPage() {
  const user = await requirePageUser();

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
