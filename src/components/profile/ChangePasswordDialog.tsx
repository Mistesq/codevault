"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

import { changePassword } from "@/actions/profile";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema } from "@/lib/validations/auth";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid details.");
      return;
    }

    setPending(true);
    const result = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    reset();
    setOpen(false);
    toast.success("Password updated.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRound className="size-4" />
        Change Password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
