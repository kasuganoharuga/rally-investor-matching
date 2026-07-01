import "server-only";

import type { InvestorSummary } from "@/features/investors/types/investor";

const SEED_INVESTORS: InvestorSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Example Seed VC",
    slug: "example-seed-vc",
    investorType: "vc",
    hqCountry: "AU",
    stageFocus: ["pre-seed", "seed"],
    screeningStatus: "screened",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Example Angel Syndicate",
    slug: "example-angel-syndicate",
    investorType: "angel",
    hqCountry: "NZ",
    stageFocus: ["seed"],
    screeningStatus: "unscreened",
  },
];

export class InvestorRepository {
  async listSummaries(): Promise<InvestorSummary[]> {
    // TODO: replace seed data with PostgreSQL queries via lib/server/db.ts
    return SEED_INVESTORS;
  }
}

export const investorRepository = new InvestorRepository();
