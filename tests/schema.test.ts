import { describe, expect, it } from "vitest";
import { intakeSchema } from "@/lib/schema";
import { validIntake } from "./fixtures";

describe("intakeSchema", () => {
  it("accepts a complete intake", () => {
    expect(intakeSchema.safeParse(validIntake()).success).toBe(true);
  });
  it("rejects when a required consent item is missing", () => {
    const v = validIntake();
    v.consent.accepted = ["collect", "photo", "ai"];
    expect(intakeSchema.safeParse(v).success).toBe(false);
  });
  it("allows 'not sure' measurements but rejects impossible values", () => {
    const v = validIntake();
    expect(intakeSchema.safeParse(v).success).toBe(true);
    v.profile.measurements.height.value = 5000;
    expect(intakeSchema.safeParse(v).success).toBe(false);
  });
  it("rejects a bad phone number", () => {
    const v = validIntake();
    v.contact.phone = "abc";
    expect(intakeSchema.safeParse(v).success).toBe(false);
  });
});
