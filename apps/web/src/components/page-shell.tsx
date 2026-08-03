import { pageContainer, type PageWidth } from "@/components/page-width";
import { SiteHeader, type SiteHeaderSection } from "@/components/site-header";
import type { UserRole } from "@/features/auth/types/auth";
import { cn } from "@/lib/utils";

export function PageShell({
  width,
  active,
  user,
  children,
  className,
}: {
  width: PageWidth;
  active: SiteHeaderSection;
  user: { email: string; role: UserRole };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active={active} user={user} />
      <div className={pageContainer(width, cn("py-7", className))}>{children}</div>
    </main>
  );
}
