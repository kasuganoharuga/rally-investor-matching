import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requirePageUser } from "@/features/auth/server/page-guards";

export async function ChangePasswordPage() {
  const user = await requirePageUser();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="change-password" user={user} />

      <div className="flex justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Replace the temporary password from your invitation email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
