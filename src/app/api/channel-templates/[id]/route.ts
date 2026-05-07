import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant, requireWriteAccess } from "@/lib/tenant";
import { jsonError } from "@/lib/api";

const FieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  type: z.enum(["string", "url", "price", "number"]).optional(),
});

const TemplatePatchInput = z.object({
  name: z.string().min(1).max(120).optional(),
  fields: z.array(FieldSchema).min(1).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const t = await requireWriteAccess();
    const body = TemplatePatchInput.parse(await req.json());
    const existing = await prisma.channelTemplate.findFirst({
      where: { id: params.id, organizationId: t.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const tpl = await prisma.channelTemplate.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.fields !== undefined ? { fields: body.fields as unknown as object } : {}),
      },
    });
    return NextResponse.json(tpl);
  } catch (e) {
    return jsonError(e);
  }
}

