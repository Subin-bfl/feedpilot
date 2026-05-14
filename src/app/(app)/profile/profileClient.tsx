"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";

type Role = "OWNER" | "ADMIN" | "STANDARD" | "READONLY";

type Props = {
  initial: {
    email: string;
    name: string;
    activeOrganizationId: string;
    orgs: Array<{ id: string; name: string; slug: string; role: Role }>;
  };
};

export function ProfileClient({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [password, setPassword] = useState("");
  const [activeOrgId, setActiveOrgId] = useState(initial.activeOrganizationId);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const activeOrg = useMemo(() => initial.orgs.find((o) => o.id === activeOrgId), [activeOrgId, initial.orgs]);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, password: password || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setPassword("");
      setSaved("Saved");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function switchOrg(nextOrgId: string) {
    setActiveOrgId(nextOrgId);
    setSwitching(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/profile/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: nextOrgId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Switch failed");

      // Active org is embedded in the NextAuth JWT; force a fresh sign-in so session reflects it.
      await signOut({ callbackUrl: `${window.location.origin}/login` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Switch failed");
      setSwitching(false);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Delete failed");
      await signOut({ callbackUrl: `${window.location.origin}/login` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-6">
          <Label>Email</Label>
          <Input value={initial.email} disabled />
        </div>
        <div className="sm:col-span-6">
          <Label>Active organization</Label>
          <Select
            value={activeOrgId}
            disabled={switching || initial.orgs.length <= 1}
            onChange={(e) => switchOrg(e.target.value)}
          >
            {initial.orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.slug})
              </option>
            ))}
          </Select>
          {activeOrg && (
            <div className="mt-2 text-xs text-muted-foreground">
              Your role in this org: <Badge variant="secondary">{activeOrg.role}</Badge>
            </div>
          )}
          {initial.orgs.length > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Switching org signs you out so your session refreshes with the new org.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-6">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="sm:col-span-6">
          <Label>New password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={saveProfile} disabled={saving || switching}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">{saved}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      <div className="rounded-md border border-destructive/30 bg-white p-4">
        <div className="text-sm font-medium text-[#111111]">Danger zone</div>
        <p className="mt-1 text-xs text-muted-foreground">Delete your account and sign out everywhere.</p>
        <div className="mt-3">
          <Button variant="destructive" onClick={deleteAccount} disabled={deleting || switching}>
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

