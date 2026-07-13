import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComingSoonPanelProps = {
  title: string;
  description: string;
  note: string;
};

/**
 * Placeholder body for admin sub-pages that have nav/role wiring in place
 * but no data layer yet (e.g. investor/company record management). Keeps
 * the "not built yet" pages visually consistent without duplicating the
 * same heading + card markup in each one.
 */
export function ComingSoonPanel({ title, description, note }: ComingSoonPanelProps) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{note}</CardContent>
      </Card>
    </div>
  );
}
