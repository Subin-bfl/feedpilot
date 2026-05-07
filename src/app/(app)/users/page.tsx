import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant, isAdminRole } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MembersClient } from "./usersClient";

export default async function UsersPage() {
  const t = await requireTenant();
  if (!isAdminRole(t.orgRole)) redirect("/dashboard");

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: t.organizationId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage members and permissions for this organization.</p>
        </div>
        <Badge variant="secondary">Admin only</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <MembersClient
            initialMembers={members.map((m) => ({
              id: m.id,
              role: m.role,
              createdAt: m.createdAt.toISOString(),
              user: { id: m.user.id, email: m.user.email, name: m.user.name ?? "" },
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

