import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TenantError } from "./tenant";

export function jsonError(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: err.issues },
      { status: 400 }
    );
  }
  const message = err instanceof Error ? err.message : "Internal error";
  console.error("API error:", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
