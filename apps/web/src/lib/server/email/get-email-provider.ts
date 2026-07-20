import "server-only";

import { ConsoleEmailProvider } from "@/lib/server/email/console-email-provider";
import type { EmailProvider } from "@/lib/server/email/email-provider";
import { SesEmailProvider } from "@/lib/server/email/ses-email-provider";

let cachedProvider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = process.env.EMAIL_PROVIDER ?? "console";

  if (providerName === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_PROVIDER=console is not allowed in production");
    }
    cachedProvider = new ConsoleEmailProvider();
    return cachedProvider;
  }

  if (providerName === "ses") {
    cachedProvider = new SesEmailProvider();
    return cachedProvider;
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${providerName}`);
}
