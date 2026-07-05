import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/auth/GitHubIcon";

/**
 * Full-width GitHub OAuth button shared by the sign-in and register forms.
 * `loading` shows the spinner while the GitHub flow is in flight; `disabled`
 * covers "any auth request pending". `label` differs per page ("Sign in with
 * GitHub" vs "Sign up with GitHub").
 */
export function GitHubAuthButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GitHubIcon className="size-4" />
      )}
      {label}
    </Button>
  );
}
