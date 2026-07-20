import { AcceptInvitationPage } from "@/features/invitations/components/accept-invitation-page";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InviteAccept({ params }: PageProps) {
  const { token } = await params;
  return <AcceptInvitationPage token={token} />;
}
