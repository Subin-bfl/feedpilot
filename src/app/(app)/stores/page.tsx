import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function StoresPage() {
  const t = await requireTenant();
  const stores = await prisma.store.findMany({
    where: { organizationId: t.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true, sourceFeeds: true, channelFeeds: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stores</h1>
          <p className="text-sm text-muted-foreground">All stores in your organization.</p>
        </div>
        <Link href="/stores/new">
          <Button>New store</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stores.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No stores yet. Create your first one.
            </CardContent>
          </Card>
        )}
        {stores.map((s) => (
          <Link key={s.id} href={`/stores/${s.id}`} className="block">
            <Card className="transition hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{s.name}</span>
                  <Badge variant="secondary">{s.platform}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Products</p>
                  <p className="text-lg font-semibold">{s._count.products}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source feeds</p>
                  <p className="text-lg font-semibold">{s._count.sourceFeeds}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Channel feeds</p>
                  <p className="text-lg font-semibold">{s._count.channelFeeds}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
