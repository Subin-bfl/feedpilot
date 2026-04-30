import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedUploader } from "./FeedUploader";
import { formatDate } from "@/lib/utils";

export default async function StoreDetailPage({ params }: { params: { id: string } }) {
  const t = await requireTenant();
  const store = await prisma.store.findFirst({
    where: { id: params.id, organizationId: t.organizationId },
    include: {
      sourceFeeds: { orderBy: { uploadedAt: "desc" } },
      channelFeeds: {
        include: { template: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { products: true } },
    },
  });
  if (!store) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {store.platform} · {store.currency} · {store.country}
            {store.websiteUrl && (
              <>
                {" · "}
                <a href={store.websiteUrl} className="underline" target="_blank" rel="noreferrer">
                  {store.websiteUrl}
                </a>
              </>
            )}
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline">View products ({store._count.products})</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload source feed (CSV or XML)</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedUploader storeId={store.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source feeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {store.sourceFeeds.length === 0 && (
            <p className="text-sm text-muted-foreground">No source feeds yet.</p>
          )}
          {store.sourceFeeds.map((sf) => (
            <div key={sf.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{sf.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sf.productCount} products · {sf.detectedColumns.length} columns ·
                  uploaded {formatDate(sf.uploadedAt)}
                </p>
              </div>
              <Badge variant="secondary">
                {/\.(xml|rss)$/i.test(sf.name) ? "XML" : "CSV"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel feeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {store.channelFeeds.length === 0 && (
            <p className="text-sm text-muted-foreground">No channel feeds yet.</p>
          )}
          {store.channelFeeds.map((cf) => (
            <Link
              key={cf.id}
              href={`/channel-feeds/${cf.id}`}
              className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
            >
              <div>
                <p className="font-medium">{cf.name}</p>
                <p className="text-xs text-muted-foreground">{cf.template.name}</p>
              </div>
              <Badge variant="secondary">{cf.channel}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
