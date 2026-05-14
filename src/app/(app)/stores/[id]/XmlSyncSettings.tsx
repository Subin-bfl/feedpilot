"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Props = {
  storeId: string;
  initialXmlFeedUrl: string;
  initialXmlSyncFrequency: "HOURLY" | "DAILY" | "WEEKLY";
  initialXmlLastSyncAt: string | null;
  initialXmlLastSyncError: string | null;
};

export function XmlSyncSettings(props: Props) {
  const [xmlFeedUrl, setXmlFeedUrl] = useState(props.initialXmlFeedUrl);
  const [xmlSyncFrequency, setXmlSyncFrequency] = useState(props.initialXmlSyncFrequency);
  const [xmlLastSyncAt, setXmlLastSyncAt] = useState<string | null>(props.initialXmlLastSyncAt);
  const [xmlLastSyncError, setXmlLastSyncError] = useState<string | null>(props.initialXmlLastSyncError);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/stores/${props.storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xmlFeedUrl, xmlSyncFrequency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save XML sync settings");
      setMessage("Settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save XML sync settings");
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/stores/${props.storeId}/sync`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setXmlLastSyncAt(new Date().toISOString());
      setXmlLastSyncError(null);
      setMessage("XML sync completed.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setXmlLastSyncError(msg);
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label>XML feed URL</Label>
          <Input
            placeholder="https://example.com/products.xml"
            value={xmlFeedUrl}
            onChange={(e) => setXmlFeedUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Auto-sync frequency</Label>
          <Select value={xmlSyncFrequency} onChange={(e) => setXmlSyncFrequency(e.target.value as Props["initialXmlSyncFrequency"])}>
            <option value="HOURLY">Hourly</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        <Button type="button" variant="outline" onClick={syncNow} disabled={syncing || !xmlFeedUrl}>
          {syncing ? "Syncing..." : "Sync now"}
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        <p>
          The scheduler checks about every minute whether your frequency window has passed, then runs a full sync (same
          as &quot;Sync now&quot;). On your machine, run <code className="rounded bg-muted px-1 py-0.5">npm run xml-sync-scheduler</code> in a second terminal
          alongside <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>; hosted deploys start it automatically with the web server.
        </p>
        <p className="mt-2">
          Last sync: {xmlLastSyncAt ? new Date(xmlLastSyncAt).toLocaleString() : "Never"}
        </p>
        {xmlLastSyncError && <p className="text-destructive">Last error: {xmlLastSyncError}</p>}
      </div>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

