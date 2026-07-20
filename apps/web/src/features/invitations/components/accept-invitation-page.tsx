import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInvitationForm } from "@/features/invitations/components/accept-invitation-form";
import { invitationService } from "@/features/invitations/server/services/invitation-service";

type AcceptInvitationPageProps = {
  token: string;
};

function formatRole(role: string): string {
  return role.replaceAll("_", " ");
}

export async function AcceptInvitationPage({ token }: AcceptInvitationPageProps) {
  let invitation:
    | Awaited<ReturnType<typeof invitationService.getPublicInvitation>>
    | null = null;

  try {
    invitation = await invitationService.getPublicInvitation(token);
  } catch {
    invitation = null;
  }

  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, revoked, or already used.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept your Rally invitation</CardTitle>
          <CardDescription>
            Create a password for {invitation.email}. You will join as a{" "}
            {formatRole(invitation.role)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
