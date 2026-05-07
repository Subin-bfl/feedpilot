"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StoreDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this store and all related feeds/products?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
      {busy ? "Deleting..." : "Delete"}
    </Button>
  );
}

