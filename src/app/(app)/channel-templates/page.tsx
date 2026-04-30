import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TemplatesPage() {
  const t = await requireTenant();
  const templates = await prisma.channelTemplate.findMany({
    where: { organizationId: t.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Channel templates</h1>
        <p className="text-sm text-muted-foreground">
          Field schemas used when generating feeds for each channel.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tpl) => {
          const fields = (tpl.fields as { key: string; label: string; required?: boolean }[]) ?? [];
          return (
            <Card key={tpl.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tpl.name}</span>
                  <Badge variant="secondary">{tpl.channel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{fields.length} fields</p>
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => (
                    <Badge key={f.key} variant={f.required ? "default" : "outline"}>
                      {f.key}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
