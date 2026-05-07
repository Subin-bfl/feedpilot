import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { ChannelFeedActions } from "./ChannelFeedActions";

export default async function ChannelFeedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const t = await requireTenant();
  const cf = await prisma.channelFeed.findFirst({
    where: { id: params.id, store: { organizationId: t.organizationId } },
    include: { store: true, template: true },
  });
  if (!cf) notFound();

  const subnav = [
    { href: `/channel-feeds/${cf.id}`, label: "Overview" },
    { href: `/channel-feeds/${cf.id}/mapping`, label: "Mapping" },
    { href: `/channel-feeds/${cf.id}/rules`, label: "Rules" },
    { href: `/channel-feeds/${cf.id}/validation`, label: "Validation" },
    { href: `/channel-feeds/${cf.id}/preview`, label: "Preview" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{cf.name}</h1>
          <p className="text-sm text-muted-foreground">
            {cf.store.name} · {cf.template.name}{" "}
            <Badge variant="secondary" className="ml-2">
              {cf.channel}
            </Badge>
          </p>
        </div>
        <div className="lg:pt-1">
          <ChannelFeedActions channelFeedId={cf.id} publicToken={cf.publicToken} />
        </div>
      </div>
      <nav className="flex gap-1 border-b">
        {subnav.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm hover:border-primary"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
