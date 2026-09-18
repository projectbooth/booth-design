import { describe, expect, it } from "vitest";
import { normalizeIdentity, normalizeMembership } from "../types";

// Pins the adapter that isolates booth-core's actual (inconsistent-casing) /api/me
// response shape from the rest of this codebase — see types.ts's file-level note #1.
// If booth-core adds json tags and starts returning lowerCamelCase nested fields, this
// test is the one that should fail first.

describe("normalizeMembership", () => {
  it("lowercases booth-core's capitalized Workspace/Role keys", () => {
    expect(normalizeMembership({ Workspace: "acme-analytics", Role: "owner" })).toEqual({
      workspace: "acme-analytics",
      role: "owner",
    });
  });
});

describe("normalizeIdentity", () => {
  it("normalizes memberships and active together", () => {
    const raw = {
      subject: "sub-1",
      email: "jordan@example.com",
      memberships: [
        { Workspace: "acme-analytics", Role: "owner" as const },
        { Workspace: "acme-eng", Role: "viewer" as const },
      ],
      active: { Workspace: "acme-analytics", Role: "owner" as const },
    };
    expect(normalizeIdentity(raw)).toEqual({
      subject: "sub-1",
      email: "jordan@example.com",
      memberships: [
        { workspace: "acme-analytics", role: "owner" },
        { workspace: "acme-eng", role: "viewer" },
      ],
      active: { workspace: "acme-analytics", role: "owner" },
    });
  });
});
