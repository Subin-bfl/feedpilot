"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ValidationPanel } from "./ValidationPanel";

type Diff = {
  productIndex: number;
  excluded: boolean;
  appliedRules: string[];
  before: Record<string, string>;
  after: Record<string, string>;
};

type PreviewData = {
  fields: { key: string; label: string }[];
  detectedColumns: string[];
  diffs: Diff[];
  rows: Record<string, string>[];
  sourceSample: Record<string, unknown>[];
  validation: {
    score: number;
    errorCount: number;
    warningCount: number;
    issues: { level: "error" | "warning"; message: string; field?: string; productIndex?: number }[];
  };
  productCount: number;
  excludedCount: number;
};

export function FeedPreview({ channelFeedId }: { channelFeedId: string }) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"transformed" | "source" | "diff">("transformed");

  useEffect(() => {
    fetch(`/api/channel-feeds/${channelFeedId}/preview?limit=20`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [channelFeedId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading preview…</p>;
  if (!data) return <p className="text-sm text-destructive">Failed to load preview.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Preview
            <Badge variant="secondary">{data.productCount} source products</Badge>
            <Badge variant="warning">{data.excludedCount} excluded</Badge>
            <Badge variant="success">{data.productCount - data.excludedCount} included</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Button
              variant={tab === "transformed" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("transformed")}
            >
              Transformed
            </Button>
            <Button
              variant={tab === "source" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("source")}
            >
              Source
            </Button>
            <Button
              variant={tab === "diff" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("diff")}
            >
              Diff
            </Button>
          </div>

          {tab === "transformed" && (
            <Table>
              <THead>
                <TR>
                  {data.fields.map((f) => (
                    <TH key={f.key}>{f.label}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {data.rows.map((r, i) => (
                  <TR key={i}>
                    {data.fields.map((f) => (
                      <TD key={f.key} className="max-w-[260px] truncate">
                        {r[f.key]}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {tab === "source" && (
            <Table>
              <THead>
                <TR>
                  {data.detectedColumns.map((c) => (
                    <TH key={c}>{c}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {data.sourceSample.map((r, i) => (
                  <TR key={i}>
                    {data.detectedColumns.map((c) => (
                      <TD key={c} className="max-w-[260px] truncate">
                        {String(r[c] ?? "")}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {tab === "diff" && (
            <div className="space-y-3">
              {data.diffs.map((d) => {
                const fieldKeys = Array.from(
                  new Set([...Object.keys(d.before), ...Object.keys(d.after)])
                );
                return (
                  <div key={d.productIndex} className="rounded-md border p-3 text-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{d.productIndex}
                      </span>
                      {d.excluded ? (
                        <Badge variant="destructive">excluded</Badge>
                      ) : (
                        <Badge variant="secondary">included</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {d.appliedRules.length} rule(s) applied
                      </span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="w-1/5 py-1">Field</th>
                          <th className="w-2/5 py-1">Before</th>
                          <th className="w-2/5 py-1">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldKeys.map((k) => {
                          const before = d.before[k] ?? "";
                          const after = d.after[k] ?? "";
                          const changed = before !== after;
                          return (
                            <tr
                              key={k}
                              className={changed ? "bg-amber-50" : "border-t border-muted/30"}
                            >
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{k}</td>
                              <td
                                className={
                                  "py-1 pr-2 align-top " +
                                  (changed ? "bg-red-100/60 line-through decoration-red-400/60" : "")
                                }
                              >
                                {before || <span className="text-muted-foreground">—</span>}
                              </td>
                              <td
                                className={
                                  "py-1 align-top " + (changed ? "bg-emerald-100/60 font-medium" : "")
                                }
                              >
                                {after || <span className="text-muted-foreground">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ValidationPanel
        score={data.validation.score}
        errorCount={data.validation.errorCount}
        warningCount={data.validation.warningCount}
        issues={data.validation.issues}
      />
    </div>
  );
}
