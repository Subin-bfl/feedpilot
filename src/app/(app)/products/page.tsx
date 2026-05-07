"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

type Product = {
  id: string;
  externalId: string | null;
  title: string;
  description?: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  imageLink: string | null;
  productUrl?: string | null;
  createdAt?: string;
  data?: Record<string, unknown>;
};

type Store = { id: string; name: string };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [q, setQ] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [availability, setAvailability] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((s) => setStores(s.map((x: Store) => ({ id: x.id, name: x.name }))));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q) params.set("q", q);
    if (storeId) params.set("storeId", storeId);
    if (availability) params.set("availability", availability);
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        setItems(j.items);
        setTotal(j.total);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, q, storeId, availability]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: "",
        accessorKey: "imageLink",
        cell: ({ row }) =>
          row.original.imageLink ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.original.imageLink}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-muted" />
          ),
      },
      { header: "ID", accessorKey: "externalId" },
      { header: "Title", accessorKey: "title" },
      { header: "Brand", accessorKey: "brand" },
      {
        header: "Price",
        cell: ({ row }) =>
          row.original.price != null
            ? `${row.original.price} ${row.original.currency ?? ""}`
            : "—",
      },
      {
        header: "Stock",
        cell: ({ row }) => {
          const a = row.original.availability ?? "";
          const ok = !a.toLowerCase().includes("out");
          return <Badge variant={ok ? "success" : "destructive"}>{a || "—"}</Badge>;
        },
      },
    ],
    []
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedDataEntries = Object.entries(selectedProduct?.data ?? {}).slice(0, 80);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">{total} products</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Search title, brand, ID…"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <Select
              value={storeId}
              onChange={(e) => {
                setPage(1);
                setStoreId(e.target.value);
              }}
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              value={availability}
              onChange={(e) => {
                setPage(1);
                setAvailability(e.target.value);
              }}
            >
              <option value="">Any availability</option>
              <option value="in stock">In stock</option>
              <option value="out of stock">Out of stock</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        emptyMessage={loading ? "Loading…" : "No products. Upload a CSV to a store to get started."}
        onRowClick={(row) => setSelectedProduct(row)}
      />

      <div className="flex items-center justify-end gap-3 text-sm">
        <span>
          Page {page} of {pageCount}
        </span>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#f4c400]/35 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#111111]">{selectedProduct.title || "(untitled)"}</h2>
                <p className="text-sm text-muted-foreground">
                  Product details · ID {selectedProduct.externalId || selectedProduct.id}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Close
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                {selectedProduct.imageLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.imageLink}
                    alt={selectedProduct.title}
                    className="h-56 w-full rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-3 md:col-span-2">
                <InfoRow label="Title" value={selectedProduct.title} />
                <InfoRow label="External ID" value={selectedProduct.externalId || "—"} />
                <InfoRow label="Brand" value={selectedProduct.brand || "—"} />
                <InfoRow
                  label="Price"
                  value={
                    selectedProduct.price != null
                      ? `${selectedProduct.price} ${selectedProduct.currency ?? ""}`.trim()
                      : "—"
                  }
                />
                <InfoRow
                  label="Availability"
                  value={
                    <Badge
                      variant={
                        (selectedProduct.availability ?? "").toLowerCase().includes("out")
                          ? "destructive"
                          : "success"
                      }
                    >
                      {selectedProduct.availability || "—"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Product URL"
                  value={
                    selectedProduct.productUrl ? (
                      <a
                        href={selectedProduct.productUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#111111] underline"
                      >
                        Open product page
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </div>

            {selectedProduct.description && (
              <div className="mt-6 rounded-lg border bg-[#fffdf4] p-4">
                <p className="mb-1 text-sm font-semibold text-[#111111]">Description</p>
                <p className="text-sm text-[#111111]/90">{selectedProduct.description}</p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-[#111111]">Raw product fields</h3>
              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <tbody>
                    {selectedDataEntries.length === 0 && (
                      <tr>
                        <td className="p-3 text-muted-foreground">No raw fields available.</td>
                      </tr>
                    )}
                    {selectedDataEntries.map(([k, v]) => (
                      <tr key={k} className="border-b last:border-b-0">
                        <td className="w-1/3 bg-muted/30 p-2 font-medium">{k}</td>
                        <td className="p-2">{String(v ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-md border p-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="col-span-2 text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}
