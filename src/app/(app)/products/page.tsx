"use client";

import { useEffect, useMemo, useState } from "react";
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
  brand: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  imageLink: string | null;
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
    </div>
  );
}
