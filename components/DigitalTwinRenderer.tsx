"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { DigitalTwinData } from "@/lib/types";

function coercePositions(src: any): Float32Array | null {
  if (!src) return null;
  if (src instanceof Float32Array) return src;
  if (Array.isArray(src)) return new Float32Array(src);
  // Handle objects coming from JSON that look like {0:..., length:...}
  if (typeof src === "object" && "length" in src) return new Float32Array(Array.from(src as ArrayLike<number>));
  return null;
}

function coerceColors(src: any): { array: Float32Array | Uint8Array; itemSize: number; normalized?: boolean } | null {
  if (!src) return null;

  // Already a typed array?
  if (src instanceof Uint8Array) {
    // 0..255 — tell three.js to normalize to 0..1
    return { array: src, itemSize: 3, normalized: true };
  }
  if (src instanceof Float32Array) {
    // Could be 0..1 or accidentally 0..255; detect and fix
    let needsDivide = false;
    for (let i = 0; i < Math.min(src.length, 90); i++) {
      if (src[i] > 1.0) { needsDivide = true; break; }
    }
    if (needsDivide) {
      const out = new Float32Array(src.length);
      for (let i = 0; i < src.length; i++) out[i] = src[i] / 255;
      return { array: out, itemSize: 3 };
    }
    return { array: src, itemSize: 3 };
  }

  // Plain array from JSON
  if (Array.isArray(src)) {
    // Assume 0..1 floats (most common after JSON). If you stored 0..255, convert here:
    let needsDivide = false;
    for (let i = 0; i < Math.min(src.length, 90); i++) {
      if (src[i] > 1.0) { needsDivide = true; break; }
    }
    const f32 = new Float32Array(src.length);
    if (needsDivide) {
      for (let i = 0; i < src.length; i++) f32[i] = (src[i] as number) / 255;
    } else {
      for (let i = 0; i < src.length; i++) f32[i] = src[i] as number;
    }
    return { array: f32, itemSize: 3 };
  }

  // Array-like from JSON’d typed arrays
  if (typeof src === "object" && "length" in src) {
    const arr = Array.from(src as ArrayLike<number>);
    return coerceColors(arr);
  }

  return null;
}

const PointCloud: React.FC<{ data: { vertices: any; colors?: any } | null }> = ({ data }) => {
  if (!data?.vertices) return null;

  const positions = coercePositions(data.vertices);
  if (!positions) return null;

  const colorInfo = data.colors ? coerceColors(data.colors) : null;

  return (
    <points>
      <bufferGeometry>
        {/* position attribute */}
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        {/* color attribute (optional) */}
        {colorInfo && (
          // BufferAttribute(array, itemSize, normalized?)
          <bufferAttribute
            attach="attributes-color"
            args={[colorInfo.array as any, colorInfo.itemSize, Boolean(colorInfo.normalized)]}
          />
        )}
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors={Boolean(colorInfo)} />
    </points>
  );
};

export default function DigitalTwinRenderer({
  digitalTwin,
  wsConnected,
}: {
  digitalTwin: DigitalTwinData;
  wsConnected?: boolean;
}) {
  const { pointCloudData, pathData, poseData } = digitalTwin;

  return (
    <div className="h-full">
      <div className="h-full bg-gray-900 rounded relative">
        <div className="absolute top-2 left-2 z-10 text-xs text-cyan-400 bg-black/75 px-2 py-1 rounded">
          {wsConnected ? "● STREAMING" : pointCloudData ? "● RETAINED" : "○ IDLE"}
        </div>
        <div className="absolute top-2 right-2 z-10 text-xs text-green-400 bg-black/75 px-2 py-1 rounded">
          3D VIEW
        </div>

        <Canvas className="w-full h-full">
          <PerspectiveCamera makeDefault position={[10, 10, 10]} />
          <OrbitControls enablePan enableZoom enableRotate />
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 10, 5]} intensity={0.3} />
          {/* @ts-ignore helper typing */}
          <gridHelper args={[20, 20]} position={[0, -1.3, 0]} />

          <Suspense fallback={null}>
            <PointCloud data={pointCloudData as any} />
          </Suspense>
          {/* If you later persist these, re-enable:
          <Suspense fallback={null}><PathLine data={pathData} /></Suspense>
          <Suspense fallback={null}><PoseIndicator data={poseData} /></Suspense>
          */}
        </Canvas>

        {(pointCloudData || poseData || pathData) && (
          <div className="absolute bottom-2 left-2 z-10 text-xs text-green-400 bg-black/75 px-2 py-1 rounded max-w-xs">
            {pointCloudData && (
              <>
                <p>Points: {Math.floor((pointCloudData.vertices?.length ?? 0) / 3).toLocaleString()}</p>
                {pointCloudData.timestamp && (
                  <p>Updated: {new Date(pointCloudData.timestamp).toLocaleTimeString()}</p>
                )}
              </>
            )}
            {!wsConnected && <p className="text-blue-400">Status: Retained</p>}
            {wsConnected && <p className="text-cyan-400">Status: Live Stream</p>}
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-10 text-xs text-gray-400 bg-black/75 px-2 py-1 rounded">
          <p>Mouse: Rotate • Wheel: Zoom • Right-click: Pan</p>
        </div>
      </div>
    </div>
  );
}
