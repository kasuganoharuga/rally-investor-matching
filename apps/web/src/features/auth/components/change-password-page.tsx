import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { getCurrentUser } from "@/features/auth/server/session";

export async function ChangePasswordPage() {
  // A page redirect, not requireUser(): that throws an ApiError meant
  // for API routes, which would surface here as an unhandled exception
  // instead of sending the visitor to sign in.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
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
    </main>
  );
}
