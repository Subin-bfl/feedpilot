"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewStorePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    platform: "SHOPIFY",
    currency: "USD",
    country: "US",
    websiteUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed");
      setLoading(false);
      return;
    }
    const created = await res.json();
    router.push(`/stores/${created.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>New store</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Platform">
              <Select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              >
                <option value="SHOPIFY">Shopify</option>
                <option value="WOOCOMMERCE">WooCommerce</option>
                <option value="CUSTOM">Custom</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency (ISO 4217)">
                <Input
                  value={form.currency}
                  maxLength={3}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                />
              </Field>
              <Field label="Country (ISO 3166-1 alpha-2)">
                <Input
                  value={form.country}
                  maxLength={2}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                />
              </Field>
            </div>
            <Field label="Website URL">
              <Input
                placeholder="https://example.com"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create store"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
