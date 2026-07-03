"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface CheckoutStatusToastProps {
  // The `?checkout=` value from the Stripe redirect back to /settings.
  status: "success" | "cancelled";
}

// Fires a one-off toast after returning from Stripe Checkout, then strips the
// `?checkout=` param so a refresh doesn't re-toast. The webhook — not this
// redirect — is the source of truth for Pro state; this is purely UI feedback.
export function CheckoutStatusToast({ status }: CheckoutStatusToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Guard against React StrictMode's double-invoke firing the toast twice.
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;

    if (status === "success") {
      toast.success("Welcome to Pro! Your plan is being activated.");
    } else {
      toast("Checkout cancelled.");
    }

    router.replace(pathname);
  }, [status, router, pathname]);

  return null;
}
