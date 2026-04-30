import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const FieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  type: z.enum(["string", "url", "price", "number"]).optional(),
});

const TemplateInput = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["GOOGLE", "META", "TIKTOK", "MICROSOFT", "CUSTOM"]),
  fields: z.array(FieldSchema).min(1),
});

export async function GET() {
  try {
    const t = await requireTenant();
    const templates = await prisma.channelTemplate.findMany({
      where: { organizationId: t.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const t = await requireTenant();
    const body = TemplateInput.parse(await req.json());
    const tpl = await prisma.channelTemplate.create({
      data: {
        organizationId: t.organizationId,
        name: body.name,
        channel: body.channel,
        fields: body.fields as unknown as object,
      },
    });
    return NextResponse.json(tpl, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
