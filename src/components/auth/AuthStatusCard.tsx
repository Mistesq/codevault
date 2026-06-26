import type { ReactNode } from "react";

// Presentational status card for the auth flow (check-email, verification
// result). Renders inside the shared (auth) layout card, so it only supplies the
// icon, copy, and action(s).
export function AuthStatusCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
