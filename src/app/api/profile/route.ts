import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(128).optional(),
});

export async function PATCH(req: Request) {
  try {
    const t = await requireTenant();
    const body = PatchBody.parse(await req.json());

    const data: { name?: string; passwordHash?: string } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id: t.userId },
      data,
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}

