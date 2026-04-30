import { NextResponse } from "next/server";
import { z } from "zod";
import { suggest } from "@/services/ai";
import { requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const Body = z.object({
  product: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  try {
    await requireTenant();
    const body = Body.parse(await req.json());
    return NextResponse.json(suggest(body.product));
  } catch (e) {
    return jsonError(e);
  }
}
