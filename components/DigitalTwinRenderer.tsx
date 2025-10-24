"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { PathLine, PoseIndicator, PointCloud, DigitalTwinData } from "./twin-rendering-shared";

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
          <Suspense fallback={null}><PathLine data={pathData} /></Suspense>
          <Suspense fallback={null}><PoseIndicator data={poseData} /></Suspense>
         
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
