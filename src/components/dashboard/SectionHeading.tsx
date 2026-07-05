import type { IconComponent } from "@/lib/type-icons";

/** Icon + label heading for the dashboard's item/collection sections. */
export function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: IconComponent;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}
