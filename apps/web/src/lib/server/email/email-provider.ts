import "server-only";

export type InvitationEmailInput = {
  to: string;
  role: string;
  temporaryPassword: string;
  invitedByName: string;
};

export interface EmailProvider {
  sendInvitation(input: InvitationEmailInput): Promise<void>;
}
