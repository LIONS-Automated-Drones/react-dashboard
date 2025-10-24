"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSnapshot, deleteSnapshot } from "@/lib/snapshots.store";
import DigitalTwinRenderer from "@/components/DigitalTwinRenderer";
import type { DigitalTwinData, SnapshotRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";

export default function SnapshotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [rec, setRec] = useState<SnapshotRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await getSnapshot(id);
      setRec(r ?? null);
    })();
  }, [id]);

  if (!id) return <div className="p-4">Invalid snapshot id</div>;
  if (!rec) return <div className="p-4">Loading…</div>;

  const twin: DigitalTwinData = JSON.parse(rec.digitalTwinJson);

  const onDelete = async () => {
    if (!confirm("Delete this snapshot? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteSnapshot(rec.id);
      router.push("/snapshots");
    } catch (e) {
      alert("Failed to delete snapshot.");
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-3 h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Snapshot: {rec.name}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" >
            <Link href="/snapshots">
              <ArrowLeftIcon className="w-4 h-4 inline-block" /> Back
            </Link>
          </Button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"} <TrashIcon className="w-4 h-4 inline-block" />
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        ID: {rec.id} • Points: {rec.numPointCloudPoints.toLocaleString()} • Saved:{" "}
        {new Date(rec.createdAt).toLocaleString()}
      </div>
      <div className="h-full min-h-[480px]">
        <DigitalTwinRenderer digitalTwin={twin} wsConnected={false} />
      </div>
    </div>
  );
}
