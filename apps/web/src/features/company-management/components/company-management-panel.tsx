"use client";

import { useMemo, useState } from "react";

import { CompanyManagementDetail } from "@/features/company-management/components/company-management-detail";
import { CompanyManagementEditor } from "@/features/company-management/components/company-management-editor";
import { CompanyManagementList } from "@/features/company-management/components/company-management-list";
import {
  CompanyManagementEmpty,
  CompanyManagementError,
  CompanyManagementLoading,
} from "@/features/company-management/components/company-management-states";
import { CompanyManagementStats } from "@/features/company-management/components/company-management-stats";
import {
  CompanyManagementToolbar,
  type CompanySort,
  type CompanyStatusFilter,
} from "@/features/company-management/components/company-management-toolbar";
import {
  companyProfileCompletion,
  managedCompanyStatus,
} from "@/features/company-management/types/company-management";
import { useCompanyManagement } from "@/features/company-management/hooks/use-company-management";

export function CompanyManagementPanel() {
  const { items, isLoading, error, reload, save } = useCompanyManagement();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CompanyStatusFilter>("all");
  const [sort, setSort] = useState<CompanySort>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = items.filter((company) => {
      if (status !== "all" && managedCompanyStatus(company) !== status) return false;
      if (!normalizedQuery) return true;
      const matching = company.currentMatchingProfile;
      return [
        company.profile.name,
        company.profile.oneLiner,
        company.owner.name,
        company.owner.email,
        company.profile.hqCity,
        company.profile.hqCountry,
        matching?.stage,
        matching?.sectorPrimary,
        matching?.useCasePrimary,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.profile.name.localeCompare(b.profile.name);
      if (sort === "completion") {
        return companyProfileCompletion(b) - companyProfileCompletion(a);
      }
      return (
        new Date(b.profile.updatedAt).getTime() -
        new Date(a.profile.updatedAt).getTime()
      );
    });
  }, [items, query, sort, status]);

  const selectedCompany =
    filteredItems.find((company) => company.id === selectedId) ??
    filteredItems[0] ??
    null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Management
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">
          Manage Companies
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review founder company profiles, current fundraising signals, and platform
          activity.
        </p>
      </div>

      {isLoading ? <CompanyManagementLoading /> : null}
      {!isLoading && error ? (
        <CompanyManagementError message={error.message} onRetry={() => void reload()} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? <CompanyManagementEmpty /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <>
          <CompanyManagementStats items={items} />
          <CompanyManagementToolbar
            query={query}
            status={status}
            sort={sort}
            resultCount={filteredItems.length}
            onQueryChange={(value) => {
              setQuery(value);
              setEditorOpen(false);
            }}
            onStatusChange={(value) => {
              setStatus(value);
              setEditorOpen(false);
            }}
            onSortChange={setSort}
          />
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)] lg:items-start">
            <CompanyManagementList
              items={filteredItems}
              selectedId={selectedCompany?.id ?? null}
              onSelect={(id) => {
                setSelectedId(id);
                setEditorOpen(false);
              }}
            />
            <CompanyManagementDetail
              company={selectedCompany}
              onEdit={() => setEditorOpen(true)}
            />
          </div>
          {selectedCompany ? (
            <CompanyManagementEditor
              company={selectedCompany}
              open={editorOpen}
              onClose={() => setEditorOpen(false)}
              onSave={save}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
