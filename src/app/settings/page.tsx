import { getProfileData } from "@/lib/db/profile";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import { BillingSection } from "@/components/billing/BillingSection";
import { CheckoutStatusToast } from "@/components/billing/CheckoutStatusToast";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  // The session is verified by the settings layout's AppShell guard.
  const profile = await getProfileData();
  const { checkout } = await searchParams;
  const checkoutStatus =
    checkout === "success" || checkout === "cancelled" ? checkout : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {checkoutStatus && <CheckoutStatusToast status={checkoutStatus} />}

      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      {/* Editor preferences (reads current values from EditorPreferencesContext,
          seeded by the app shell from the database). */}
      <EditorPreferencesForm />

      {/* Billing / plan (Upgrade for Free, Manage subscription for Pro). */}
      <BillingSection isPro={profile.isPro} />

      {/* Account actions (hidden on the demo account — the server actions
          enforce the actual block; this is cosmetic). */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Account</h2>
        {profile.isDemo ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Account settings are disabled on the shared demo account.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.hasPassword
                ? "Change your password or permanently delete your account."
                : "Permanently delete your account."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
              {profile.hasPassword && <ChangePasswordDialog />}
              <DeleteAccountDialog />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
