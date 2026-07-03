import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { syncSubscriptionToUser } from "@/lib/billing/sync";

// Public Stripe webhook receiver. This route MUST stay public — Stripe carries
// no session, so `constructEvent`'s signature check IS the authentication. Do
// NOT add an `auth()` guard here.
//
// Signature verification needs the raw request body plus Node `crypto`, so this
// route must run on the Node runtime (the Next.js default). Never set
// `export const runtime = "edge"`.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw text body — never `request.json()` here, it breaks the signature check.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Retrieve the subscription for its full status, then reconcile.
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToUser(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionToUser(event.data.object);
        break;
      }
      default:
        // Unhandled event types are acknowledged (200) so Stripe stops resending.
        break;
    }
  } catch (error) {
    // Return 500 so Stripe retries; every handler is idempotent (see sync.ts).
    console.error(`Stripe webhook handler error (${event.type}):`, error);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
