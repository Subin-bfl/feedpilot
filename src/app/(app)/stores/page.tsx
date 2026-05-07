import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoreDeleteButton } from "./StoreDeleteButton";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <Card key={s.id} className="flex h-full flex-col transition hover:bg-accent/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="min-w-0">
                    <Link href={`/stores/${s.id}`} className="block truncate hover:underline">
                      {s.name}
                    </Link>
                  </CardTitle>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {s.xmlFeedUrl && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      XML auto-sync: {s.xmlSyncFrequency}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {s.platform}
                  </Badge>
                  <StoreDeleteButton id={s.id} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto grid grid-cols-3 gap-6 text-sm">
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
        ))}
      </div>
    </div>
  );
}
