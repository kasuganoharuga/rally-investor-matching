import "server-only";

export type InvitationEmailInput = {
  to: string;
  role: string;
  invitedByName: string;
  acceptUrl: string;
  expiresAt: Date;
};

export type WelcomeEmailInput = {
  to: string;
  name: string;
  workspaceUrl: string;
};

export type VerificationEmailInput = {
  to: string;
  verifyUrl: string;
};

export interface EmailProvider {
  sendInvitation(input: InvitationEmailInput): Promise<void>;
  sendWelcome(input: WelcomeEmailInput): Promise<void>;
  sendVerification(input: VerificationEmailInput): Promise<void>;
}
