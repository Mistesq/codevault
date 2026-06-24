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
