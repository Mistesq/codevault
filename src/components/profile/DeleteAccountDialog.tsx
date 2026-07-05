"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteAccount } from "@/actions/profile";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteFooter } from "@/components/ui/confirm-delete-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  // Enable the destructive button only once "DELETE" is typed exactly.
  const canDelete = confirm === "DELETE";

  async function handleDelete() {
    if (!canDelete) return;
    setPending(true);
    // On success deleteAccount signs out and redirects, so this only returns on
    // failure.
    const result = await deleteAccount(confirm);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirm("");
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2 className="size-4" />
        Delete Account
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="text-foreground">
            Deleting your account will permanently remove:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>All your items (snippets, prompts, commands, etc.)</li>
            <li>All your collections</li>
            <li>Your profile and account data</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmDelete">
            Type <span className="font-semibold text-foreground">DELETE</span> to
            confirm
          </Label>
          <Input
            id="confirmDelete"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <ConfirmDeleteFooter
          pending={pending}
          confirmLabel="Delete Account"
          onConfirm={handleDelete}
          confirmDisabled={!canDelete}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
