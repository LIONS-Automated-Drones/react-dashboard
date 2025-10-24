"use client";

import React, { useState } from "react";
import { addSnapshot } from "@/lib/snapshots.store";
import { DigitalTwinData, SnapshotRecord } from "@/lib/types";
import { Button } from "./ui/button";
import { SaveIcon, ExternalLinkIcon, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";

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
  const [isOpen, setIsOpen] = useState(false);
  const [modalState, setModalState] = useState<"input" | "success" | "error">("input");
  const [snapshotName, setSnapshotName] = useState("");
  const [savedSnapshotId, setSavedSnapshotId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = () => {
    setIsOpen(true);
    setModalState("input");
    setSnapshotName("");
    setSavedSnapshotId(null);
    setErrorMessage("");
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    const name = snapshotName.trim();
    if (!name) {
      setErrorMessage("Please enter a name for the snapshot.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
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
      setSavedSnapshotId(rec.id);
      setModalState("success");
    } catch (e) {
      console.error(e);
      setModalState("error");
      setErrorMessage("Failed to save snapshot. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSnapshot = () => {
    if (savedSnapshotId) {
      window.open(`/snapshots/${savedSnapshotId}`, "_blank");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="emerald"
        className={`px-3 py-2 shadow ${className ?? ""}`}
      >
        Save Snapshot <SaveIcon className="w-4 h-4 inline-block" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          {modalState === "input" && (
            <>
              <DialogHeader>
                <DialogTitle>Save Snapshot</DialogTitle>
                <DialogDescription>
                  Enter a name for this snapshot to save the current state.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Snapshot name..."
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                  disabled={isSaving}
                />
                {errorMessage && (
                  <p className="text-sm text-destructive mt-2">{errorMessage}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}

          {modalState === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Snapshot Saved!
                </DialogTitle>
                <DialogDescription>
                  Your snapshot &quot;{snapshotName}&quot; has been saved successfully.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Close
                </Button>
                <Button onClick={handleViewSnapshot}>
                  View <ExternalLinkIcon className="w-4 h-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {modalState === "error" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-destructive">Error</DialogTitle>
                <DialogDescription>{errorMessage}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Close
                </Button>
                <Button onClick={() => setModalState("input")}>Try Again</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
