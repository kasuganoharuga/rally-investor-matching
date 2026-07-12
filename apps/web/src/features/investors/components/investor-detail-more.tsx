import { tagList } from "@/features/investors/components/investor-detail-format";
import { TagGroup } from "@/features/investors/components/investor-detail-tag-group";
import type { InvestorDetail } from "@/features/investors/types/investor";

type InvestorDetailMoreProps = {
  investor: InvestorDetail;
};

export function InvestorDetailMore({ investor }: InvestorDetailMoreProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-foreground">
        Additional focus &amp; approach
      </h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <TagGroup label="Business model focus" values={investor.businessModelFocus} />
        <TagGroup label="Founder-fit hints" values={investor.founderFit} />
      </div>

      <div className="mt-5 grid gap-4 border-t border-dashed border-border pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Entry channels
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {tagList(investor.entryChannels).join(", ") || "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Preferred contact channel
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {investor.preferredChannel ?? "Not specified"}
          </p>
        </div>
      </div>
    </section>
  );
}
