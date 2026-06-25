import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Initials from a name: "Alex Shapovalov" -> "AS", "demo" -> "D".
export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

/**
 * Reusable avatar: shows the user's image (e.g. from GitHub) when present,
 * otherwise falls back to their initials.
 */
export function UserAvatar({ name, image, size = "default", className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className="bg-sidebar-primary font-medium text-sidebar-primary-foreground">
        {userInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
