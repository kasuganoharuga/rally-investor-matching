"use client";

import type { ReactNode } from "react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";

export type VcDetailTab = "overview" | "evidence";

export function VcDetailTabs({
  tab,
  onTabChange,
  overview,
  evidence,
  evidenceAnchorId,
}: {
  tab: VcDetailTab;
  onTabChange: (tab: VcDetailTab) => void;
  overview: ReactNode;
  evidence: ReactNode;
  evidenceAnchorId: string;
}) {
  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as VcDetailTab)}>
      <TabsList>
        <TabsTab value="overview">Overview</TabsTab>
        <TabsTab value="evidence">Deals &amp; evidence</TabsTab>
      </TabsList>

      <TabsPanel value="overview">{overview}</TabsPanel>

      <TabsPanel value="evidence">
        <div id={evidenceAnchorId} className="scroll-mt-6 space-y-3">
          {evidence}
        </div>
      </TabsPanel>
    </Tabs>
  );
}
