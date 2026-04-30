import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStore, requireTenant } from "@/lib/tenant";
import { detectFormat, extractProductFields, parseFeed } from "@/services/feedParser";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Form = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1).max(160).optional(),
  format: z.enum(["auto", "csv", "xml"]).optional().default("auto"),
});

export async function POST(req: Request) {
  try {
    const t = await requireTenant();
    const formData = await req.formData();
    const fields = Form.parse({
      storeId: formData.get("storeId"),
      name: formData.get("name") || undefined,
      format: formData.get("format") || undefined,
    });
    await requireStore(fields.storeId, t.organizationId);

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const text = await file.text();
    const filename = file instanceof File ? file.name : null;

    const format =
      fields.format === "auto"
        ? detectFormat({ filename, sample: text })
        : fields.format;

    const parsed = await parseFeed(text, format);

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: `${format.toUpperCase()} contained no products.` },
        { status: 400 }
      );
    }

    const sourceFeed = await prisma.sourceFeed.create({
      data: {
        storeId: fields.storeId,
        name: fields.name ?? filename ?? `upload.${format}`,
        rawProducts: parsed.rows as object[],
        detectedColumns: parsed.columns,
        productCount: parsed.rows.length,
      },
    });

    // Materialize products for catalog browsing.
    const productData = parsed.rows.map((row) => {
      const f = extractProductFields(row);
      return {
        storeId: fields.storeId,
        sourceFeedId: sourceFeed.id,
        externalId: f.externalId ?? null,
        title: f.title ?? "(untitled)",
        description: f.description ?? null,
        brand: f.brand ?? null,
        price: f.price ?? null,
        currency: f.currency ?? null,
        availability: f.availability ?? null,
        imageLink: f.imageLink ?? null,
        productUrl: f.productUrl ?? null,
        data: row as object,
      };
    });

    // Chunk inserts to avoid a single massive query.
    const CHUNK = 500;
    for (let i = 0; i < productData.length; i += CHUNK) {
      await prisma.product.createMany({
        data: productData.slice(i, i + CHUNK),
      });
    }

    return NextResponse.json(
      {
        id: sourceFeed.id,
        format,
        productCount: sourceFeed.productCount,
        detectedColumns: sourceFeed.detectedColumns,
      },
      { status: 201 }
    );
  } catch (e) {
    return jsonError(e);
  }
}
