import { afterEach, describe, expect, it } from "vitest";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";

// Secure by default: enabled unless explicitly disabled with a falsy value.
describe("isEmailVerificationEnabled", () => {
  const original = process.env.EMAIL_VERIFICATION_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
    else process.env.EMAIL_VERIFICATION_ENABLED = original;
  });

  it("defaults to enabled when the var is unset", () => {
    delete process.env.EMAIL_VERIFICATION_ENABLED;
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it("stays enabled for arbitrary truthy values", () => {
    process.env.EMAIL_VERIFICATION_ENABLED = "true";
    expect(isEmailVerificationEnabled()).toBe(true);
    process.env.EMAIL_VERIFICATION_ENABLED = "yes";
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it.each(["false", "0", "off", "OFF", "  False  "])(
    "is disabled for the falsy value %j",
    (value) => {
      process.env.EMAIL_VERIFICATION_ENABLED = value;
      expect(isEmailVerificationEnabled()).toBe(false);
    },
  );
});
