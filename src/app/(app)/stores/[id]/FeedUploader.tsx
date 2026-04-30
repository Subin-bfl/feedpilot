"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Format = "auto" | "csv" | "xml";

export function FeedUploader({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    productCount: number;
    detectedColumns: string[];
    format: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("storeId", storeId);
    fd.append("format", format);
    if (name) fd.append("name", name);

    const res = await fetch("/api/source-feeds/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Upload failed");
      return;
    }
    const j = await res.json();
    setResult({
      productCount: j.productCount,
      detectedColumns: j.detectedColumns,
      format: j.format,
    });
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label>Feed name (optional)</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="products-2025-q1"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Format</Label>
          <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="auto">Auto-detect</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>File</Label>
        <Input
          type="file"
          accept=".csv,.tsv,.txt,.xml,.rss,text/csv,application/xml,text/xml"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Accepts <code>.csv</code> and <code>.xml</code> (RSS 2.0 / Google Shopping XML or any
          element list with repeating product nodes).
        </p>
      </div>

      <Button type="submit" disabled={loading || !file}>
        {loading ? "Uploading…" : "Upload"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-emerald-700">
          Imported {result.productCount} products with {result.detectedColumns.length} columns
          ({result.format.toUpperCase()}).
        </p>
      )}
    </form>
  );
}
