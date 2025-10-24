export type SnapshotId = string;

export interface SnapshotRecord {
  id: SnapshotId;
  name: string;
  createdAt: number;
  digitalTwinJson: string;
  numPointCloudPoints: number;

  // future
  chatLogsJson?: string;
  telemetryJson?: string;
  videoMetaJson?: string;
}
