"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

type Role = "OWNER" | "ADMIN" | "STANDARD" | "READONLY";

type MemberRow = {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; email: string; name: string };
};

export function MembersClient({ initialMembers }: { initialMembers: MemberRow[] }) {
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "STANDARD" as Role,
  });

  const columns = useMemo<ColumnDef<MemberRow>[]>(() => {
    return [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-[#111111]">{row.original.user.email}</div>
            {row.original.user.name ? (
              <div className="truncate text-xs text-muted-foreground">{row.original.user.name}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.role === "READONLY" ? "outline" : "secondary"}>{row.original.role}</Badge>
            <Select
              value={row.original.role}
              disabled={busyId !== null || row.original.role === "OWNER"}
              onChange={async (e) => {
                const nextRole = e.target.value as Role;
                setBusyId(row.original.id);
                setError(null);
                try {
                  const res = await fetch(`/api/org/members/${row.original.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: nextRole }),
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error ?? "Update failed");
                  }
                  setMembers((prev) =>
                    prev.map((m) => (m.id === row.original.id ? { ...m, role: nextRole } : m))
                  );
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Update failed");
                } finally {
                  setBusyId(null);
                }
              }}
              className="h-9 w-[160px]"
            >
              <option value="OWNER">Admin (Owner)</option>
              <option value="ADMIN">Admin</option>
              <option value="STANDARD">Standard</option>
              <option value="READONLY">Read-only</option>
            </Select>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId !== null || row.original.role === "OWNER"}
              onClick={async () => {
                if (!confirm("Remove this member from the organization?")) return;
                setBusyId(row.original.id);
                setError(null);
                try {
                  const res = await fetch(`/api/org/members/${row.original.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error ?? "Remove failed");
                  }
                  setMembers((prev) => prev.filter((m) => m.id !== row.original.id));
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Remove failed");
                } finally {
                  setBusyId(null);
                }
              }}
            >
              Remove
            </Button>
          </div>
        ),
      },
    ];
  }, [busyId]);

  async function createMember() {
    setCreating(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name || undefined,
          role: form.role === "OWNER" ? "ADMIN" : form.role,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Create failed");

      setMembers((prev) => [
        ...prev,
        {
          id: j.member.id,
          role: j.member.role,
          createdAt: new Date().toISOString(),
          user: { id: j.member.user.id, email: j.member.user.email, name: j.member.user.name ?? "" },
        },
      ]);
      setCreated({ email: j.member.user.email, tempPassword: j.tempPassword });
      setForm({ email: "", name: "", role: "STANDARD" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-[#111111]">Add member</div>
            <div className="text-xs text-muted-foreground">
              This creates a login for the user and returns a temporary password once.
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="sm:col-span-4">
            <Label>Name (optional)</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="sm:col-span-3">
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              <option value="ADMIN">Admin</option>
              <option value="STANDARD">Standard</option>
              <option value="READONLY">Read-only</option>
            </Select>
          </div>
          <div className="sm:col-span-12">
            <Button onClick={createMember} disabled={creating || !form.email}>
              {creating ? "Creating…" : "Create member"}
            </Button>
          </div>
        </div>

        {created && (
          <div className="mt-4 rounded-md border border-[#f4c400]/40 bg-[#fff7cc]/60 p-3">
            <div className="text-sm font-medium text-[#111111]">Member created</div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Email:</span> <span className="font-mono">{created.email}</span>
            </div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Temporary password:</span>{" "}
              <span className="font-mono">{created.tempPassword}</span>
            </div>
          </div>
        )}

        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
      </div>

      <div className="rounded-md border border-destructive/30 bg-white p-4">
        <div className="text-sm font-medium text-[#111111]">Factory reset</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Admin-only. This deletes all stores, source feeds, products, channel feeds, runs/exports, and templates in
          this organization. Members remain.
        </p>
        <div className="mt-3">
          <Button
            variant="destructive"
            disabled={resetting || busyId !== null || creating}
            onClick={async () => {
              if (
                !confirm(
                  "Reset to factory settings? This will DELETE all org data (stores/products/feeds/templates). Members stay."
                )
              )
                return;
              setResetting(true);
              setError(null);
              try {
                const res = await fetch("/api/org/reset", { method: "POST" });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j.error ?? "Reset failed");
                window.location.href = "/dashboard";
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Reset failed");
                setResetting(false);
              }
            }}
          >
            {resetting ? "Resetting…" : "Reset to factory settings"}
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={members} emptyMessage="No members yet." />
    </div>
  );
}

