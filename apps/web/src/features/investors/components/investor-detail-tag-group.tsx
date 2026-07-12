import { tagList } from "@/features/investors/components/investor-detail-format";

type TagGroupProps = {
  label: string;
  values: string[];
};

export function TagGroup({ label, values }: TagGroupProps) {
  const tags = tagList(values);
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Not specified</p>
      )}
    </div>
  );
}
