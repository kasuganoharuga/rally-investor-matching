import { LoginPage } from "@/features/auth/components/login-page";
import { getCurrentUser } from "@/features/auth/server/session";
import { HomePage } from "@/features/home/components/home-page";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    return <HomePage user={user} />;
  }

  return <LoginPage />;
}
