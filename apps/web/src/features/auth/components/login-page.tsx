import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/features/auth/server/session";

export async function LoginPage() {
  // This is the site root, so a signed-in visitor landing here (e.g. via
  // bookmark or browser back) should go straight to the app instead of
  // seeing the sign-in form again.
  const user = await getCurrentUser();
  if (user) {
    redirect("/investors");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use the credentials from your invitation email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
