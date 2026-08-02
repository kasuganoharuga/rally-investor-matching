import { SectorTag } from "@/features/investors/components/sector-tag";

export function VcSectorTier({
  title,
  note,
  values,
}: {
  title: string;
  note?: string;
  values: string[];
}) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground/70">
        {title}
      </p>
      {note ? (
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground/80">{note}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <SectorTag key={value} sector={value} />
        ))}
      </div>
    </div>
  );
}
