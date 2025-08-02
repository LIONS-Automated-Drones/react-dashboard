"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Eye, EyeOff, Scan, ScanLine, X } from "lucide-react"
import * as THREE from "three"

interface DigitalTwinProps {
  title: string
  videoId: string
  onMessage: (message: string) => void
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
      <pointsMaterial size={0.05} vertexColors />
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

export default function DigitalTwin({ title, videoId, onMessage }: DigitalTwinProps) {
  const [isDigitalTwinOn, setIsDigitalTwinOn] = useState(false)
  const [isPointCloudGenerating, setIsPointCloudGenerating] = useState(false)
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulate point cloud data generation
  const generateMockPointCloudData = (): PointCloudData => {
    const numPoints = 5000
    const vertices = new Float32Array(numPoints * 3)
    const colors = new Float32Array(numPoints * 3)

    for (let i = 0; i < numPoints; i++) {
      const i3 = i * 3

      // Generate random points in a sphere-like distribution
      const radius = Math.random() * 10
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      vertices[i3] = radius * Math.sin(phi) * Math.cos(theta)
      vertices[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      vertices[i3 + 2] = radius * Math.cos(phi)

      // Generate colors based on height
      const height = vertices[i3 + 2]
      colors[i3] = Math.max(0, height / 10) // Red component
      colors[i3 + 1] = Math.max(0, 1 - Math.abs(height) / 10) // Green component
      colors[i3 + 2] = Math.max(0, -height / 10) // Blue component
    }

    return {
      vertices,
      colors,
      timestamp: Date.now(),
    }
  }

  // Fetch point cloud data from server (simulated)
  const fetchPointCloudData = async (): Promise<PointCloudData> => {
    // In a real implementation, this would fetch a PLY file from the server
    // const response = await fetch('/api/pointcloud/latest.ply')
    // const plyData = await response.arrayBuffer()
    // return parsePlyFile(plyData)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return generateMockPointCloudData()
  }

  const handleDigitalTwinToggle = () => {
    const newState = !isDigitalTwinOn
    setIsDigitalTwinOn(newState)

    if (newState) {
      onMessage(`Digital twin display enabled for ${title}`)
    } else {
      onMessage(`Digital twin display disabled for ${title}`)
    }
  }

  const handlePointCloudToggle = async () => {
    const newState = !isPointCloudGenerating
    setIsPointCloudGenerating(newState)

    if (newState) {
      onMessage(`Point cloud generation started for ${title}`)
      setIsLoading(true)

      try {
        // Initial point cloud fetch
        const initialData = await fetchPointCloudData()
        setPointCloudData(initialData)
        onMessage(`Point cloud data received - ${initialData.vertices.length / 3} points`)

        // Start periodic polling every 5 seconds
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const newData = await fetchPointCloudData()
            setPointCloudData(newData)
            onMessage(`Point cloud updated - ${newData.vertices.length / 3} points`)
          } catch (error) {
            onMessage(`Point cloud update failed: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }, 5000)
      } catch (error) {
        onMessage(`Point cloud generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsPointCloudGenerating(false)
      } finally {
        setIsLoading(false)
      }
    } else {
      onMessage(`Point cloud generation terminated for ${title}`)

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Clear point cloud data
      setPointCloudData(null)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 bg-gray-50">
        <CardTitle className="text-sm font-medium text-green-600">Digital Twin Display</CardTitle>
        <div className="flex space-x-2">
          {/* Digital Twin Toggle Button */}
          <Button
            variant={isDigitalTwinOn ? "default" : "outline"}
            size="sm"
            onClick={handleDigitalTwinToggle}
            className="h-7 px-3 text-xs"
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

          {/* Point Cloud Generation Button */}
          <Button
            variant={isPointCloudGenerating ? "destructive" : "default"}
            size="sm"
            onClick={handlePointCloudToggle}
            disabled={isLoading}
            className={`h-7 px-3 text-xs ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isPointCloudGenerating ? (
              <>
                <ScanLine className="h-3 w-3 mr-1" />
                Stop Scan
              </>
            ) : (
              <>
                <Scan className="h-3 w-3 mr-1" />
                Start Scan
              </>
            )}
          </Button>

          {/* Minimize Button */}
          {/* <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
            <X className="h-4 w-4" />
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className={`p-0 flex-1 ${isMinimized ? "hidden" : ""}`}>
        <div className="bg-black h-full p-4 overflow-hidden">
          {!isDigitalTwinOn && (
            <div className="flex flex-col items-center justify-center h-full text-green-400 text-center">
              <p className="mb-2">Digital twin not displayed</p>
              <p className="text-xs text-gray-500">Click Digital Twin On to view 3D environment</p>
            </div>
          )}

          {isDigitalTwinOn && (
            <div className="h-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-green-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mb-4"></div>
                  <p>Loading point cloud data...</p>
                </div>
              ) : (
                <div className="h-full bg-gray-900 rounded relative">
                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 z-10 text-xs text-cyan-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    {isPointCloudGenerating ? "● SCANNING" : "○ IDLE"}
                  </div>
                  <div className="absolute top-2 right-2 z-10 text-xs text-green-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    3D VIEW
                  </div>

                  {/* Three.js Canvas */}
                  <Canvas className="w-full h-full">
                    <PerspectiveCamera makeDefault position={[10, 10, 10]} />
                    <OrbitControls enablePan enableZoom enableRotate />

                    {/* Lighting */}
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />

                    {/* Grid helper */}
                    <gridHelper args={[20, 20]} />

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
