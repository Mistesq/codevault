import { notFound } from "next/navigation";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { getItemsByTypeSlug } from "@/lib/db/items";
import { TypeIcon, typeLabel } from "@/lib/type-icons";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;

  const result = await getItemsByTypeSlug(slug);
  if (!result) notFound();

  const { type, items } = result;
  // Pluralize the capitalized type label: "snippet" -> "Snippets", "URL" -> "URLs".
  const heading = `${typeLabel(type.name)}s`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"
          style={type.color ? { color: type.color } : undefined}
        >
          <TypeIcon name={type.icon} className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">{heading}</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {heading.toLowerCase()} yet.
        </p>
      )}
    </div>
  );
}
