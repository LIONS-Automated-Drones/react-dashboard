export type SnapshotId = string;

export interface DigitalTwinData {
  // point cloud can be absent during warmup
  pointCloudData: {
    vertices: Float32Array | number[];                 // [x,y,z,...]
    colors?: Uint8Array | Float32Array | number[];     // allow Float32 too
    timestamp: number;
  } | null;
  pathData?: any | null;
  poseData?: any | null;
}

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
