import { Suspense } from "react";

import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  // SignInForm reads search params (callbackUrl / registered), so it must sit
  // inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
