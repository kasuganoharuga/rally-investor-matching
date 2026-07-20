import "server-only";

export type InvitationEmailInput = {
  to: string;
  role: string;
  invitedByName: string;
  acceptUrl: string;
  expiresAt: Date;
};

export interface EmailProvider {
  sendInvitation(input: InvitationEmailInput): Promise<void>;
}
