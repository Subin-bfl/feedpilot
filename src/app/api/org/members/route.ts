import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/tenant";

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional().nullable(),
  role: z.enum(["ADMIN", "STANDARD", "READONLY"]),
});

function makeTempPassword() {
  // Human-friendly enough to share once, still high entropy.
  return `FP-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}!`;
}

export async function GET() {
  try {
    const t = await requireAdmin();
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: t.organizationId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: { id: m.user.id, email: m.user.email, name: m.user.name },
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const t = await requireAdmin();
    const body = CreateBody.parse(await req.json());

    const email = body.email.toLowerCase();
    const tempPassword = makeTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {
          ...(body.name ? { name: body.name } : {}),
          // If the user already exists, we intentionally reset their password to the
          // generated temp password so the admin can hand them credentials.
          passwordHash,
          // Ensure they can sign in and land in this org.
          activeOrganizationId: t.organizationId,
        },
        create: {
          email,
          name: body.name ?? null,
          passwordHash,
          activeOrganizationId: t.organizationId,
        },
      });

      const membership = await tx.organizationMember.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: t.organizationId } },
        update: { role: body.role },
        create: { userId: user.id, organizationId: t.organizationId, role: body.role },
      });

      return { user, membership };
    });

    return NextResponse.json(
      {
        member: {
          id: result.membership.id,
          role: result.membership.role,
          user: { id: result.user.id, email: result.user.email, name: result.user.name },
        },
        tempPassword,
      },
      { status: 201 }
    );
  } catch (e) {
    return jsonError(e);
  }
}

