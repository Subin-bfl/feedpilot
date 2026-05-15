import { NextResponse } from "next/server";
import { requireStore, requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";
import { syncStoreFromXmlUrl } from "@/services/storeXmlSync";

/** Allow long XML downloads + DB import on hosted platforms that honor this. */
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    await requireStore(params.id, t.organizationId);
    const result = await syncStoreFromXmlUrl(params.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}

