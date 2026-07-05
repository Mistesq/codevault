import { Loader2 } from "lucide-react";

import { AlertDialogCancel, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Shared footer for the destructive confirmation dialogs (delete item /
 * collection / account): a Cancel button plus a `destructive` confirm button
 * that shows a spinner while `pending`. `confirmDisabled` is an extra gate on
 * top of `pending` (e.g. the account dialog's "type DELETE" requirement).
 */
export function ConfirmDeleteFooter({
  pending,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
}: {
  pending: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}) {
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
      <Button
        variant="destructive"
        onClick={onConfirm}
        disabled={pending || confirmDisabled}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {confirmLabel}
      </Button>
    </AlertDialogFooter>
  );
}
