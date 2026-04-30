import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  organizationName: z.string().min(1).max(120),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "org";
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    let slugBase = slugify(body.organizationName);
    let slug = slugBase;
    let i = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${++i}`;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          name: body.name,
        },
      });
      const org = await tx.organization.create({
        data: { name: body.organizationName, slug },
      });
      await tx.organizationMember.create({
        data: { userId: u.id, organizationId: org.id, role: "OWNER" },
      });
      return u;
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (e) {
    return jsonError(e);
  }
}
