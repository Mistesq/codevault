import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Resend wrapper so sendTransactionalEmail is a true unit test — no
// network. `vi.hoisted` lets the mock exist before the hoisted factory runs.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@/lib/email/resend", () => ({
  EMAIL_FROM: "CodeVault <test@resend.dev>",
  getResend: () => ({ emails: { send } }),
}));

import { buildEmailHtml, sendTransactionalEmail } from "@/lib/email/template";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildEmailHtml", () => {
  const base = {
    heading: "Verify your email",
    bodyText: "Confirm your address.",
    ctaLabel: "Verify",
    ctaUrl: "https://app.test/verify?token=abc",
    footerText: "This link expires in 24 hours.",
  };

  it("interpolates heading, body, CTA label and footer", () => {
    const html = buildEmailHtml(base);
    expect(html).toContain("Verify your email");
    expect(html).toContain("Confirm your address.");
    expect(html).toContain(">\n        Verify\n      </a>");
    expect(html).toContain("This link expires in 24 hours.");
  });

  it("renders the CTA url in both the button href and the paste-link block", () => {
    const html = buildEmailHtml(base);
    const occurrences = html.split(base.ctaUrl).length - 1;
    expect(occurrences).toBe(2);
  });

  it("greets by name when provided", () => {
    expect(buildEmailHtml({ ...base, name: "Ada" })).toContain("Hi Ada,");
  });

  it("falls back to a generic greeting when name is missing or null", () => {
    expect(buildEmailHtml(base)).toContain("Hi,");
    expect(buildEmailHtml({ ...base, name: null })).toContain("Hi,");
  });
});

describe("sendTransactionalEmail", () => {
  it("sends via Resend with the from/to/subject/html and resolves on success", async () => {
    send.mockResolvedValue({ error: null });

    await sendTransactionalEmail({
      to: "user@example.com",
      subject: "Verify your CodeVault email",
      html: "<p>hi</p>",
      failureContext: "verification email",
    });

    expect(send).toHaveBeenCalledWith({
      from: "CodeVault <test@resend.dev>",
      to: "user@example.com",
      subject: "Verify your CodeVault email",
      html: "<p>hi</p>",
    });
  });

  it("throws with the failure context when Resend returns an error", async () => {
    send.mockResolvedValue({ error: { message: "quota exceeded" } });

    await expect(
      sendTransactionalEmail({
        to: "user@example.com",
        subject: "Verify your CodeVault email",
        html: "<p>hi</p>",
        failureContext: "verification email",
      }),
    ).rejects.toThrow("Failed to send verification email: quota exceeded");
  });
});
