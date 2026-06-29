import { getProfileData } from "@/lib/db/profile";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // The session is verified by the settings layout's AppShell guard.
  const profile = await getProfileData();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      {/* Account actions */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.hasPassword
            ? "Change your password or permanently delete your account."
            : "Permanently delete your account."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
          {profile.hasPassword && <ChangePasswordDialog />}
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
