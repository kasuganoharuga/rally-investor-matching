import { redirect } from "next/navigation";

import { LoginPage } from "@/features/auth/components/login-page";
import { getCurrentUser } from "@/features/auth/server/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/match");
  }

  return <LoginPage />;
}
