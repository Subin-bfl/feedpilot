import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileClient } from "./profileClient";

export default async function ProfilePage() {
  const t = await requireTenant();

  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: t.userId }, select: { id: true, email: true, name: true, activeOrganizationId: true } }),
    prisma.organizationMember.findMany({
      where: { userId: t.userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and active organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileClient
            initial={{
              email: user.email,
              name: user.name ?? "",
              activeOrganizationId: user.activeOrganizationId ?? t.organizationId,
              orgs: memberships.map((m) => ({
                id: m.organizationId,
                name: m.organization.name,
                slug: m.organization.slug,
                role: m.role,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

