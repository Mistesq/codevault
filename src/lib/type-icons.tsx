import type { ComponentType, CSSProperties } from "react";
import {
  Code,
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  Terminal,
} from "lucide-react";

export type IconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

// Maps the lucide icon-name strings stored on ItemType.icon to components.
// Names here match the seeded system item types (see prisma/seed.ts).
const TYPE_ICONS: Record<string, IconComponent> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File: FileIcon,
  Image: ImageIcon,
  Link: LinkIcon,
};

export function getTypeIcon(name: string | null | undefined): IconComponent {
  if (name && TYPE_ICONS[name]) return TYPE_ICONS[name];
  return FileIcon;
}

// Capitalize the first letter of a (lowercase) item-type name for display:
// "snippet" -> "Snippet". Already-cased names like "URL" are left intact.
export function typeLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Display label for pluralized type listings (e.g. the profile "Items by Type"
// cards): capitalized + pluralized, with the URL type shown as "Links" (matches
// its Link icon). Distinct from `typeLabel` + "s", which renders URL as "URLs".
export function pluralTypeLabel(name: string): string {
  if (name.toLowerCase() === "url") return "Links";
  const capitalized = typeLabel(name.toLowerCase());
  return capitalized.endsWith("s") ? capitalized : `${capitalized}s`;
}

// Renders the lucide icon for an item type. Resolves via a map lookup (not a
// call) so it's a stable, statically-referenced component, not one created
// during render.
export function TypeIcon({
  name,
  className,
  style,
}: {
  name: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = (name && TYPE_ICONS[name]) || FileIcon;
  return <Icon className={className} style={style} />;
}
