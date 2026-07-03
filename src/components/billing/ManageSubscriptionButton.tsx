"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createPortalSession } from "@/actions/billing";

// Opens the Stripe Customer Portal (manage / cancel / switch plan) via the server
// action, then redirects the browser to the returned hosted-portal URL.
// Presentational only.
export function ManageSubscriptionButton() {
  const [pending, setPending] = useState(false);

  async function openPortal() {
    setPending(true);
    try {
      const result = await createPortalSession();
      if (!result.success) {
        toast.error(result.error);
        setPending(false);
        return;
      }
      // Client-side redirect to the Stripe-hosted portal (external origin).
      window.location.href = result.data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={openPortal} disabled={pending}>
      {pending ? "Redirecting…" : "Manage subscription"}
    </Button>
  );
}
