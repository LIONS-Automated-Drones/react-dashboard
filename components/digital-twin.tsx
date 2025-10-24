"use client"

import type { DigitalTwinData as SnapshotDigitalTwinData } from "@/lib/types"
import { useState, useEffect, useRef, Suspense, useMemo, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Eye, EyeOff } from "lucide-react"
import * as THREE from "three"
import { useDashboardMessages } from "@/contexts/DashboardMessagesContext"

interface DigitalTwinProps {
  title: string
  videoId: string
}

interface PointCloudData {
  vertices: Float32Array
  // ✅ accept either; live stream could be bytes (0..255) or floats (0..1 or 0..255)
  colors: Float32Array | Uint8Array
  timestamp: number
}

interface PoseData {
  position: { x: number; y: number; z: number }
  orientation: { x: number; y: number; z: number; w: number }
  covariance: number[]
  timestamp: number
  frame_id: string
}

interface PathData {
  poses: Array<{
    position: { x: number; y: number; z: number }
    orientation: { x: number; y: number; z: number; w: number }
  }>
  timestamp: number
  frame_id: string
  num_poses: number
}

interface DigitalTwinData {
  // made nullable so we can snapshot even if only some are present
  pointCloudData: PointCloudData | null
  pathData: PathData | null
  poseData: PoseData | null
}

// expose this so the Save button can call into the component
export type DigitalTwinHandle = {
  getDigitalTwinData(): SnapshotDigitalTwinData
}

// Point Cloud Component for Three.js rendering
function PointCloud({ data }: { data: PointCloudData | null }) {
  const meshRef = useRef<THREE.Points>(null)

  useEffect(() => {
    if (!meshRef.current) return

    // dispose previous geometry if we’re about to replace it
    if (meshRef.current.geometry) {
      meshRef.current.geometry.dispose()
      meshRef.current.geometry = new THREE.BufferGeometry()
    }

    if (!data) {
      // show a placeholder cube when empty
      const g = new THREE.BoxGeometry(2, 2, 2)
      const m = new THREE.MeshStandardMaterial({ color: "gray", wireframe: true })
      // Render a mesh inside a <points> is invalid; fall back to no-geometry on points
      // We simply leave the <points> empty; the outer placeholder is handled in JSX below
      g.dispose()
      m.dispose()
      return
    }

    const { vertices, colors } = data
    const geom = new THREE.BufferGeometry()

    // positions
    geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3))

    // colors (optional but preferred)
    if (colors && colors.length === vertices.length) {
      if (colors instanceof Uint8Array) {
        // bytes 0..255 — we can mark the attribute as normalized
        const attr = new THREE.BufferAttribute(colors, 3, true) // normalized = true
        geom.setAttribute("color", attr)
      } else {
        // Float32Array — could be 0..1 (good) or 0..255 (normalize)
        let needsDivide = false
        for (let i = 0; i < Math.min(colors.length, 90); i++) {
          if (colors[i] > 1.0) { needsDivide = true; break }
        }
        if (needsDivide) {
          const scaled = new Float32Array(colors.length)
          for (let i = 0; i < colors.length; i++) scaled[i] = colors[i] / 255
          geom.setAttribute("color", new THREE.BufferAttribute(scaled, 3))
        } else {
          geom.setAttribute("color", new THREE.BufferAttribute(colors, 3))
        }
      }
    } // else: skip color attribute so we still render positions

    meshRef.current.geometry = geom

    return () => {
      geom.dispose()
    }
  }, [data])

  if (!data) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="gray" wireframe />
        </mesh>
      </group>
    )
  }

  return (
    <points ref={meshRef}>
      {/* geometry + attributes are assigned imperatively */}
      <pointsMaterial size={0.05} vertexColors toneMapped={false} sizeAttenuation />
    </points>
  )
}

// Path Line Component - renders the green trajectory
function PathLine({ data }: { data: PathData | null }) {
  const points = useMemo(() => {
    if (!data || data.poses.length === 0) return []
    return data.poses.map(
      pose => new THREE.Vector3(pose.position.x, pose.position.z, -pose.position.y)
    )
  }, [data])

  if (points.length === 0) return null

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ff00" />
    </line>
  )
}

// Pose Indicator Component - renders the purple cloud and red arrow
function PoseIndicator({ data }: { data: PoseData | null }) {
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (groupRef.current && data) {
      const quaternion = new THREE.Quaternion(
        data.orientation.x,
        data.orientation.z,
        -data.orientation.y,
        data.orientation.w
      )
      groupRef.current.quaternion.copy(quaternion)
      groupRef.current.position.set(data.position.x, data.position.z, -data.position.y)
    }
  }, [data])

  if (!data) return null

  // Extract position uncertainty from covariance matrix
  // Covariance is a 6x6 matrix (36 elements), diagonal elements are variances
  const covX = Math.sqrt(Math.abs(data.covariance[0])) // variance in x
  const covY = Math.sqrt(Math.abs(data.covariance[7])) // variance in y
  const covZ = Math.sqrt(Math.abs(data.covariance[14])) // variance in z

  // Scale factors for visualization (clamped to reasonable size)
  const scaleX = Math.min(Math.max(covX * 2, 0.2), 0.5)
  const scaleY = Math.min(Math.max(covY * 2, 0.2), 0.5)
  const scaleZ = Math.min(Math.max(covZ * 2, 0.2), 0.5)

  return (
    <group ref={groupRef}>
      {/* Purple ellipsoid representing position uncertainty */}
      <mesh scale={[scaleX, scaleZ, scaleY]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color="#9b59b6" 
          transparent 
          opacity={0.5}
          emissive="#9b59b6"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Red arrow showing orientation */}
      <group scale={0.5}>
        {/* Arrow shaft */}
        <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.25, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  )
}

// Loading component
function LoadingSpinner() {
  return (
    <mesh>
      <ringGeometry args={[1, 1.2, 8]} />
      <meshBasicMaterial color="cyan" />
    </mesh>
  )
}

const DigitalTwin = forwardRef<DigitalTwinHandle, DigitalTwinProps>(function DigitalTwin(
  { title },
  ref
) {
  const { addMessage } = useDashboardMessages()
  const [isDigitalTwinOn, setIsDigitalTwinOn] = useState(false)
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null)
  const [poseData, setPoseData] = useState<PoseData | null>(null)
  const [pathData, setPathData] = useState<PathData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Add refs to store the retained data
  const retainedPointCloudRef = useRef<PointCloudData | null>(null)
  const retainedPoseRef = useRef<PoseData | null>(null)
  const retainedPathRef = useRef<PathData | null>(null)
  // WebSocket connection
  const wsRef = useRef<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const linuxIp = process.env.NEXT_PUBLIC_LINUX_IP
  if (!linuxIp) throw new Error("NEXT_PUBLIC_LINUX_IP is not set")

  // expose data for SaveSnapshotButton
  useImperativeHandle(
    ref,
    () => ({
      getDigitalTwinData: () => ({
        pointCloudData,
        pathData,
        poseData,
      }),
    }),
    [pointCloudData, pathData, poseData]
  )

  // WebSocket connection management
  const connectWebSocket = () => {
    try {
      const wsUrl = `ws://${linuxIp}:9000`
      try { new URL(wsUrl) } catch { addMessage(`Invalid WebSocket URL: ${wsUrl}`); return }
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        addMessage("WebSocket connected to point cloud bridge")
        setWsConnected(true)
        setIsLoading(false)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle point cloud data
          if (data.pointcloud) {
            const vertices = new Float32Array(data.pointcloud.vertices)

            // Accept colors as bytes or floats
            let colors: Uint8Array | Float32Array = new Float32Array(vertices.length)
            if (data.pointcloud.colors) {
              const arr = data.pointcloud.colors as number[] | ArrayLike<number>
              // If any sample > 1, treat as 0..255 bytes; otherwise assume 0..1 floats
              let hasOverOne = false
              for (let i = 0; i < Math.min(arr.length, 90); i++) {
                if (arr[i] > 1) { hasOverOne = true; break }
              }
              colors = hasOverOne ? new Uint8Array(arr as ArrayLike<number>) : new Float32Array(arr as ArrayLike<number>)
            }

            const pc: PointCloudData = {
              vertices,
              colors,
              timestamp: (data.pointcloud.timestamp ?? Date.now() / 1000) * 1000,
            }
            setPointCloudData(pc)
            retainedPointCloudRef.current = pc

            const numPoints = data.pointcloud.num_points || vertices.length / 3
            addMessage(`Point cloud updated - ${numPoints.toLocaleString()} points from ${data.pointcloud.frame_id || "sensor"}`)
          }

          // Handle pose data
          if (data.pose) {
            const p: PoseData = {
              position: data.pose.position,
              orientation: data.pose.orientation,
              covariance: data.pose.covariance,
              timestamp: data.pose.timestamp * 1000,
              frame_id: data.pose.frame_id
            }
            setPoseData(p)
            retainedPoseRef.current = p
          }

          // Handle path data
          if (data.path) {
            const path: PathData = {
              poses: data.path.poses,
              timestamp: data.path.timestamp * 1000,
              frame_id: data.path.frame_id,
              num_poses: data.path.num_poses
            }
            setPathData(path)
            retainedPathRef.current = path
          }
        } catch (error) {
          addMessage(`Error parsing data: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      ws.onerror = (error) => {
        addMessage("WebSocket error - Make sure the Python bridge is running")
        console.error("WebSocket error details:", error)
        setWsConnected(false)
      }

      ws.onclose = (event) => {
        addMessage(`WebSocket disconnected - Code: ${event.code}, Clean: ${event.wasClean}, Reason: ${event.reason || "No reason provided"}`)
        setWsConnected(false)
        wsRef.current = null
      }

      wsRef.current = ws
    } catch (error) {
      addMessage(`Failed to connect to WebSocket: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setWsConnected(false)
    }
  }

  const handleDigitalTwinToggle = () => {
    const newState = !isDigitalTwinOn
    setIsDigitalTwinOn(newState)

    if (newState) {
      addMessage(`Digital twin display enabled for ${title}`)
      addMessage(`Streaming started for ${title}`)
      setIsLoading(true)
      
      // If we have retained data, show it immediately
      if (retainedPointCloudRef.current) {
        setPointCloudData(retainedPointCloudRef.current)
        addMessage(`Displaying retained point cloud data (${(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()} points)`)
      }
      if (retainedPoseRef.current) {
        setPoseData(retainedPoseRef.current)
        addMessage("Displaying retained pose data")
      }
      if (retainedPathRef.current) {
        setPathData(retainedPathRef.current)
        addMessage(`Displaying retained path (${retainedPathRef.current.num_poses} poses)`)
      }
      
      // Connect to WebSocket
      connectWebSocket()
    } else {
      addMessage(`Digital twin display disabled for ${title}`)
      addMessage(`Streaming stopped for ${title}`)

      // Disconnect WebSocket
      disconnectWebSocket()

      // retain current
      if (pointCloudData) retainedPointCloudRef.current = pointCloudData
      if (poseData) retainedPoseRef.current = poseData
      if (pathData) retainedPathRef.current = pathData
      if (pointCloudData || poseData || pathData) addMessage("Data retained for session")
    }
  }

  useEffect(() => {
    return () => { disconnectWebSocket() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 bg-gray-800">
        <CardTitle className="text-sm font-medium text-green-400">Digital Twin Display</CardTitle>
        <div className="flex space-x-2">
          {/* Digital Twin Toggle Button */}
          <Button
            variant={isDigitalTwinOn ? "default" : "outline"}
            size="sm"
            onClick={handleDigitalTwinToggle}
            disabled={isLoading}
            className={`h-7 px-3 text-xs ${isLoading ? "opacity-50 cursor-not-allowed" : ""} bg-green-600 text-white hover:bg-green-700 border-green-600 hover:text-white`}
          >
            {isDigitalTwinOn ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Digital Twin On
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Digital Twin Off
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="bg-black h-full p-4 overflow-hidden">
          {!isDigitalTwinOn && (
            <div className="flex flex-col items-center justify-center h-full text-green-400 text-center">
              <p className="mb-2">Digital twin not displayed</p>
              <p className="text-xs text-gray-500">Click Digital Twin On to view 3D environment</p>
              {(retainedPointCloudRef.current || retainedPoseRef.current || retainedPathRef.current) && (
                <div className="text-xs text-blue-400 mt-2">
                  <p className="font-semibold mb-1">Retained data available:</p>
                  {retainedPointCloudRef.current && (
                    <p>• Point cloud: {(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()} points</p>
                  )}
                  {retainedPoseRef.current && <p>• Pose data available</p>}
                  {retainedPathRef.current && <p>• Path: {retainedPathRef.current.num_poses} poses</p>}
                </div>
              )}
            </div>
          )}

          {isDigitalTwinOn && (
            <div className="h-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-green-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
                  <p>Connecting to point cloud stream...</p>
                </div>
              ) : (
                <div className="h-full bg-gray-900 rounded relative">
                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 z-10 text-xs text-cyan-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    {wsConnected ? "● STREAMING" : pointCloudData ? "● RETAINED" : "○ IDLE"}
                  </div>
                  <div className="absolute top-2 right-2 z-10 text-xs text-green-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    3D VIEW
                  </div>

                  {/* Three.js Canvas */}
                  <Canvas className="w-full h-full">
                    <PerspectiveCamera makeDefault position={[10, 10, 10]} />
                    <OrbitControls enablePan enableZoom enableRotate />

                    {/* Lighting - reduced to prevent color washing */}
                    <ambientLight intensity={0.3} />
                    <directionalLight position={[10, 10, 5]} intensity={0.3} />

                    {/* Grid helper */}
                    <gridHelper args={[20, 20]} position={[0, -1.3, 0]} />

                    {/* Point Cloud */}
                    <Suspense fallback={<LoadingSpinner />}>
                      <PointCloud data={pointCloudData} />
                    </Suspense>

                    {/* Path Line */}
                    <Suspense fallback={null}>
                      <PathLine data={pathData} />
                    </Suspense>

                    {/* Pose Indicator */}
                    <Suspense fallback={null}>
                      <PoseIndicator data={poseData} />
                    </Suspense>
                  </Canvas>

                   {/* Info panel */}
                   {(pointCloudData || poseData || pathData) && (
                     <div className="absolute bottom-2 left-2 z-10 text-xs text-green-400 bg-black bg-opacity-75 px-2 py-1 rounded max-w-xs">
                       {pointCloudData && (
                         <>
                           <p>Points: {(pointCloudData.vertices.length / 3).toLocaleString()}</p>
                           <p>Updated: {new Date(pointCloudData.timestamp).toLocaleTimeString()}</p>
                         </>
                       )}
                       {poseData && (
                         <p className="text-purple-400">
                           Pose: ({poseData.position.x.toFixed(2)}, {poseData.position.y.toFixed(2)}, {poseData.position.z.toFixed(2)})
                         </p>
                       )}
                       {pathData && (
                         <p className="text-green-400">Path: {pathData.num_poses} poses</p>
                       )}
                       {!wsConnected && <p className="text-blue-400">Status: Retained</p>}
                       {wsConnected && <p className="text-cyan-400">Status: Live Stream</p>}
                     </div>
                   )}

                  {/* Controls help */}
                  <div className="absolute bottom-2 right-2 z-10 text-xs text-gray-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    <p>Mouse: Rotate • Wheel: Zoom • Right-click: Pan</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

export default DigitalTwin
