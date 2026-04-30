import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const t = await requireTenant();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const storeId = searchParams.get("storeId") ?? undefined;
    const availability = searchParams.get("availability") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10))
    );

    const where = {
      store: { organizationId: t.organizationId },
      ...(storeId ? { storeId } : {}),
      ...(availability ? { availability } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { brand: { contains: q, mode: "insensitive" as const } },
              { externalId: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (e) {
    return jsonError(e);
  }
}
