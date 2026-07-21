import { CompanyManagementListRow } from "@/features/company-management/components/company-management-list-row";
import type { ManagedCompany } from "@/features/company-management/types/company-management";

export function CompanyManagementList({
  items,
  selectedId,
  onSelect,
}: {
  items: ManagedCompany[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
        No companies match the current search and filters.
      </div>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      aria-label="Companies"
    >
      {items.map((company) => (
        <CompanyManagementListRow
          key={company.id}
          company={company}
          selected={company.id === selectedId}
          onSelect={() => onSelect(company.id)}
        />
      ))}
    </section>
  );
}
