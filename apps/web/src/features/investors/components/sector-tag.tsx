import { titleCase } from "@/features/investors/components/investor-detail-format";
import { cn } from "@/lib/utils";

const SECTOR_TAG_STYLES: Record<string, string> = {
  healthcare_life_sciences: "border-rose-200 bg-rose-50 text-rose-800",
  resources_mining_metals: "border-stone-300 bg-stone-100 text-stone-800",
  energy_climate: "border-emerald-200 bg-emerald-50 text-emerald-800",
  aerospace_space_defence: "border-indigo-200 bg-indigo-50 text-indigo-800",
  fintech_financial_services: "border-sky-200 bg-sky-50 text-sky-800",
  enterprise_software_data_security: "border-violet-200 bg-violet-50 text-violet-800",
  education_workforce: "border-amber-200 bg-amber-50 text-amber-900",
  industrial_robotics_automation: "border-cyan-200 bg-cyan-50 text-cyan-900",
  food_agriculture: "border-lime-300 bg-lime-50 text-lime-900",
  transport_logistics_infrastructure: "border-blue-200 bg-blue-50 text-blue-800",
  property_construction: "border-orange-200 bg-orange-50 text-orange-900",
  consumer_marketplace: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
};

export function SectorTag({
  sector,
  className,
}: {
  sector: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs leading-5 font-medium break-words whitespace-normal",
        SECTOR_TAG_STYLES[sector] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {titleCase(sector)}
    </span>
  );
}
