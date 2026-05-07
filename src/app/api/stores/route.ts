import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const StoreInput = z.object({
  name: z.string().min(1).max(120),
  platform: z.enum(["SHOPIFY", "WOOCOMMERCE", "CUSTOM"]),
  currency: z.string().min(3).max(3).default("USD"),
  country: z.string().min(2).max(2).default("US"),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  xmlFeedUrl: z.string().url().optional().or(z.literal("")),
  xmlSyncFrequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional().default("DAILY"),
});

export async function GET() {
  try {
    const t = await requireTenant();
    const stores = await prisma.store.findMany({
      where: { organizationId: t.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { sourceFeeds: true, channelFeeds: true, products: true } },
      },
    });
    return NextResponse.json(stores);
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const t = await requireWriteAccess();
    const body = StoreInput.parse(await req.json());
    const store = await prisma.store.create({
      data: {
        organizationId: t.organizationId,
        name: body.name,
        platform: body.platform,
        currency: body.currency,
        country: body.country,
        websiteUrl: body.websiteUrl || null,
        xmlFeedUrl: body.xmlFeedUrl || null,
        xmlSyncFrequency: body.xmlSyncFrequency,
      },
    });
    return NextResponse.json(store, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
