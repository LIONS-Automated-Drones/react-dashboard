"use client"

import { useState, useEffect, useRef, Suspense } from "react"
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
  colors: Float32Array
  timestamp: number
}

// Point Cloud Component for Three.js rendering
function PointCloud({ data }: { data: PointCloudData | null }) {
  const meshRef = useRef<THREE.Points>(null)

  useEffect(() => {
    if (meshRef.current && data) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(data.vertices, 3))
      geometry.setAttribute("color", new THREE.BufferAttribute(data.colors, 3))

      meshRef.current.geometry = geometry
    }
  }, [data])

  if (!data) {
    return (
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="gray" wireframe />
      </mesh>
    )
  }

  return (
    <points ref={meshRef}>
      <bufferGeometry />
      <pointsMaterial 
        size={0.05} 
        vertexColors 
        toneMapped={false}
        sizeAttenuation={true}
      />
    </points>
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

export default function DigitalTwin({ title, videoId }: DigitalTwinProps) {
  const { addMessage } = useDashboardMessages()
  const [isDigitalTwinOn, setIsDigitalTwinOn] = useState(false)
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Add a ref to store the retained point cloud data
  const retainedPointCloudRef = useRef<PointCloudData | null>(null)
  // WebSocket connection
  const wsRef = useRef<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const linuxIp = process.env.NEXT_PUBLIC_LINUX_IP
  if (!linuxIp) {
    throw new Error("NEXT_PUBLIC_LINUX_IP is not set")
  }

  // WebSocket connection management
  const connectWebSocket = () => {
    try {
      console.log(`Attempting to connect to WebSocket at ws://${linuxIp}:9000`)
      const wsUrl = `ws://${linuxIp}:9000`
      try {
        new URL(wsUrl) // This will throw if the URL is invalid
      } catch (urlError) {
        addMessage(`Invalid WebSocket URL: ${wsUrl}`)
        return
      }
      const ws = new WebSocket(wsUrl)
      console.log("WebSocket object created, readyState:", ws.readyState, "(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)")

      ws.onopen = () => {
        addMessage("WebSocket connected to point cloud bridge")
        console.log("WebSocket opened successfully:", {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol,
          extensions: ws.extensions,
          timestamp: new Date().toISOString()
        })
        setWsConnected(true)
        setIsLoading(false)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Convert arrays to Float32Arrays for Three.js
          const vertices = new Float32Array(data.vertices)
          const colors = new Float32Array(data.colors)

          const pointCloudData: PointCloudData = {
            vertices,
            colors,
            timestamp: data.timestamp * 1000, // Convert to milliseconds
          }

          setPointCloudData(pointCloudData)
          retainedPointCloudRef.current = pointCloudData

          const numPoints = data.num_points || vertices.length / 3
          addMessage(`Point cloud updated - ${numPoints.toLocaleString()} points from ${data.frame_id || "sensor"}`)
        } catch (error) {
          addMessage(`Error parsing point cloud data: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      ws.onerror = (error) => {
        addMessage("WebSocket error - Make sure the Python bridge is running")
        console.error("WebSocket error details:", error)
        console.error("WebSocket error event:", {
          type: error.type,
          target: error.target,
          currentTarget: error.currentTarget
        })
        setWsConnected(false)
      }

      ws.onclose = (event) => {
        const reason = event.reason || "No reason provided"
        const code = event.code
        const wasClean = event.wasClean
        
        addMessage(`WebSocket disconnected - Code: ${code}, Clean: ${wasClean}, Reason: ${reason}`)
        console.log("WebSocket close event details:", {
          code: code,
          reason: reason,
          wasClean: wasClean,
          timestamp: new Date().toISOString()
        })
        
        // Common close codes:
        // 1000 - Normal closure
        // 1001 - Going away (e.g., server shutting down)
        // 1002 - Protocol error
        // 1003 - Unsupported data
        // 1006 - Abnormal closure (no close frame)
        // 1011 - Server error
        console.log("Close code meaning:", 
          code === 1000 ? "Normal closure" :
          code === 1001 ? "Going away" :
          code === 1002 ? "Protocol error" :
          code === 1003 ? "Unsupported data" :
          code === 1006 ? "Abnormal closure (connection lost)" :
          code === 1011 ? "Server error" :
          `Unknown code: ${code}`
        )
        
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
      addMessage(`Point cloud streaming started for ${title}`)
      setIsLoading(true)
      
      // If we have retained data, show it immediately
      if (retainedPointCloudRef.current) {
        setPointCloudData(retainedPointCloudRef.current)
        addMessage(
          `Displaying retained point cloud data (${(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()} points)`,
        )
      }
      
      // Connect to WebSocket
      connectWebSocket()
    } else {
      addMessage(`Digital twin display disabled for ${title}`)
      addMessage(`Point cloud streaming stopped for ${title}`)

      // Disconnect WebSocket
      disconnectWebSocket()

      // Retain the current point cloud data
      if (pointCloudData) {
        retainedPointCloudRef.current = pointCloudData
        addMessage("Point cloud data retained for session")
      }
    }
  }

  // Cleanup on unmount - this is when the dashboard closes
  useEffect(() => {
    return () => {
      // Disconnect WebSocket
      disconnectWebSocket()
    }
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
            className={`h-7 px-3 text-xs ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            } bg-green-600 text-white hover:bg-green-700 border-green-600 hover:text-white`}
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
              {retainedPointCloudRef.current && (
                <p className="text-xs text-blue-400 mt-2">
                  Retained data available ({(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()}{" "}
                  points)
                </p>
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
                  </Canvas>

                   {/* Info panel */}
                   {pointCloudData && (
                     <div className="absolute bottom-2 left-2 z-10 text-xs text-green-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                       <p>Points: {(pointCloudData.vertices.length / 3).toLocaleString()}</p>
                       <p>Updated: {new Date(pointCloudData.timestamp).toLocaleTimeString()}</p>
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
}
