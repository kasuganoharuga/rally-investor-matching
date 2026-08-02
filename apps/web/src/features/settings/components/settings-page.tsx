import { PageShell } from "@/components/page-shell";
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
    <PageShell width="form" active="settings" user={user} className="space-y-6">
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
    </PageShell>
  );
}
