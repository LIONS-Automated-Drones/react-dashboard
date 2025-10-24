"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listSnapshots, deleteSnapshot, clearAllSnapshots } from "@/lib/snapshots.store";
import type { SnapshotRecord } from "@/lib/types";

export default function SnapshotsPage() {
  const [rows, setRows] = useState<SnapshotRecord[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await listSnapshots();
      setRows(data.sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const onDelete = async (id: string) => {
    if (!confirm("Delete this snapshot? This cannot be undone.")) return;
    setBusyId(id);
    setRows((prev) => prev.filter((r) => r.id !== id)); // optimistic
    try {
      await deleteSnapshot(id);
    } catch (e) {
      const fresh = await listSnapshots();
      setRows(fresh.sort((a, b) => b.createdAt - a.createdAt));
      alert("Failed to delete snapshot.");
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const onClearAll = async () => {
    if (!confirm("Delete ALL snapshots? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearAllSnapshots();
      setRows([]);
    } catch (e) {
      alert("Failed to clear snapshots.");
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-green-400">Saved Snapshots</h1>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name…"
            className="border rounded px-2 py-1 bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500"
          />
          <button
            onClick={onClearAll}
            disabled={clearing || rows.length === 0}
            className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded border-zinc-800">
        <table className="snapshots-table w-full table-fixed text-sm">
          {/* Enforce consistent column widths */}
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[8%]" />
          </colgroup>

          <thead className="bg-zinc-800 text-zinc-100 sticky top-0">
            <tr>
              <th className="text-left p-2 font-semibold tracking-wide border-b border-zinc-700">Id</th>
              <th className="text-left p-2 font-semibold tracking-wide border-b border-zinc-700">Name</th>
              <th className="text-left p-2 font-semibold tracking-wide border-zinc-700 border-b">NumPointCloudPoints</th>
              <th className="text-left p-2 font-semibold tracking-wide border-b border-zinc-700">Created</th>
              <th className="text-left p-2 font-semibold tracking-wide border-b border-zinc-700">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-zinc-950 text-zinc-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-900">
                {/* ID (truncate so it doesn't blow the layout) */}
                <td className="p-2">
                  <div className="max-w-[520px] truncate" title={row.id}>
                    <Link href={`/snapshots/${row.id}`} className="text-blue-400 underline">
                      {row.id}
                    </Link>
                  </div>
                </td>

                {/* Name */}
                <td className="p-2">
                  <div className="max-w-[320px] truncate" title={row.name}>
                    <Link href={`/snapshots/${row.id}`} className="text-blue-400 underline">
                      {row.name}
                    </Link>
                  </div>
                </td>

                {/* Num points */}
                <td className="p-2 whitespace-nowrap">
                  {row.numPointCloudPoints.toLocaleString()}
                </td>

                {/* Created */}
                <td className="p-2 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString()}
                </td>

                {/* Actions */}
                <td className="p-2">
                  <button
                    onClick={() => onDelete(row.id)}
                    disabled={busyId === row.id}
                    className="px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                  >
                    {busyId === row.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-zinc-400" colSpan={5}>
                  No snapshots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
