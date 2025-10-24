"use client";

import React from "react";
import { addSnapshot } from "@/lib/snapshots.store";
import { DigitalTwinData, SnapshotRecord } from "@/lib/types";
import { Button } from "./ui/button";
import { SaveIcon } from "lucide-react";

function guid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 0xf;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function SaveSnapshotButton({
  getDigitalTwinData,
  className,
}: {
  getDigitalTwinData: () => Promise<DigitalTwinData> | DigitalTwinData;
  className?: string;
}) {
  const onSave = async () => {
    try {
      const name = prompt("Name this snapshot:")?.trim();
      if (!name) return;

      const twin = await getDigitalTwinData();

      // --- normalize typed arrays so JSON can store them ---
      const pc = twin.pointCloudData
        ? {
            ...twin.pointCloudData,
            vertices: Array.isArray(twin.pointCloudData.vertices)
              ? twin.pointCloudData.vertices
              : Array.from(twin.pointCloudData.vertices as Float32Array),
            colors: twin.pointCloudData.colors
              ? Array.isArray(twin.pointCloudData.colors)
                ? twin.pointCloudData.colors
                : Array.from(twin.pointCloudData.colors as Uint8Array | Float32Array)
              : undefined,
          }
        : null;

      const numPoints = pc?.vertices ? Math.floor(pc.vertices.length / 3) : 0;

      const rec: SnapshotRecord = {
        id: guid(),
        name,
        createdAt: Date.now(),
        digitalTwinJson: JSON.stringify({ pointCloudData: pc }), // ⬅️ arrays, not typed arrays
        numPointCloudPoints: numPoints,
      };

      await addSnapshot(rec);
      alert("Snapshot saved ✔");
    } catch (e) {
      console.error(e);
      alert("Failed to save snapshot.");
    }
  };

  return (
    <Button
      onClick={onSave}
      variant="emerald"
      className={`px-3 py-2 shadow ${className ?? ""}`}
    >
      Save Snapshot <SaveIcon className="w-4 h-4 inline-block" />
    </Button>
  );
}
