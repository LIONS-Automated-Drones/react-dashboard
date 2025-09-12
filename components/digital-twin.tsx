"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Eye, EyeOff, Scan, ScanLine } from "lucide-react"
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

export default function DigitalTwin({ title, videoId }: DigitalTwinProps) {
  const { addMessage } = useDashboardMessages()
  const [isDigitalTwinOn, setIsDigitalTwinOn] = useState(false)
  const [isPointCloudGenerating, setIsPointCloudGenerating] = useState(false)
  const [pointCloudData, setPointCloudData] = useState<PointCloudData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // Add a ref to store the retained point cloud data
  const retainedPointCloudRef = useRef<PointCloudData | null>(null)

  // Simulate point cloud data generation
  const generateMockPointCloudData = (): PointCloudData => {
    const numPoints = 1000
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
  const fetchPointCloudData = async (existingData?: PointCloudData): Promise<PointCloudData> => {
    // In a real implementation, this would fetch a PLY file from the server
    // const response = await fetch('/api/pointcloud/latest.ply')
    // const plyData = await response.arrayBuffer()
    // return parsePlyFile(plyData)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const newData = generateMockPointCloudData()

    // If we have existing data, accumulate the new points
    if (existingData) {
      const totalVertices = existingData.vertices.length + newData.vertices.length
      const totalColors = existingData.colors.length + newData.colors.length

      const combinedVertices = new Float32Array(totalVertices)
      const combinedColors = new Float32Array(totalColors)

      // Copy existing data
      combinedVertices.set(existingData.vertices, 0)
      combinedColors.set(existingData.colors, 0)

      // Add new data
      combinedVertices.set(newData.vertices, existingData.vertices.length)
      combinedColors.set(newData.colors, existingData.colors.length)

      return {
        vertices: combinedVertices,
        colors: combinedColors,
        timestamp: Date.now(),
      }
    }

    return newData
  }

  // Save point cloud data to server (simulated)
  const savePointCloudToServer = async (data: PointCloudData): Promise<void> => {
    // In a real implementation, this would save the PLY file to the server
    // const plyContent = generatePlyFile(data)
    // await fetch('/api/pointcloud/save', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/octet-stream' },
    //   body: plyContent
    // })

    // Simulate saving to server
    await new Promise((resolve) => setTimeout(resolve, 200))
    addMessage(`Point cloud data saved to server (${(data.vertices.length / 3).toLocaleString()} points)`)
  }

  // Delete point cloud data from server (simulated)
  const deletePointCloudFromServer = async (): Promise<void> => {
    // In a real implementation, this would delete the PLY file from the server
    // await fetch('/api/pointcloud/delete', { method: 'DELETE' })

    // Simulate deleting from server
    await new Promise((resolve) => setTimeout(resolve, 100))
    addMessage("Point cloud data deleted from server")
  }

  const handleDigitalTwinToggle = () => {
    const newState = !isDigitalTwinOn
    setIsDigitalTwinOn(newState)

    if (newState) {
      addMessage(`Digital twin display enabled for ${title}`)
      // If we have retained data and not currently generating, show the retained data
      if (retainedPointCloudRef.current && !isPointCloudGenerating) {
        setPointCloudData(retainedPointCloudRef.current)
        addMessage(
          `Displaying retained point cloud data (${(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()} points)`,
        )
      }
    } else {
      addMessage(`Digital twin display disabled for ${title}`)
    }
  }

  const handlePointCloudToggle = async () => {
    const newState = !isPointCloudGenerating
    setIsPointCloudGenerating(newState)

    if (newState) {
      addMessage(`Point cloud generation started for ${title}`)
      setIsLoading(true)

      try {
        // If we have retained data, start with that
        if (retainedPointCloudRef.current) {
          setPointCloudData(retainedPointCloudRef.current)
          addMessage(
            `Resuming from retained point cloud data (${(retainedPointCloudRef.current.vertices.length / 3).toLocaleString()} points)`,
          )
        } else {
          // Initial point cloud fetch
          const initialData = await fetchPointCloudData()
          setPointCloudData(initialData)
          retainedPointCloudRef.current = initialData
          addMessage(`Point cloud data received - ${(initialData.vertices.length / 3).toLocaleString()} points`)
        }

        // Start periodic polling every 5 seconds
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const newData = await fetchPointCloudData(retainedPointCloudRef.current || undefined)
            setPointCloudData(newData)
            retainedPointCloudRef.current = newData // Update retained data
            const totalPoints = newData.vertices.length / 3
            const newPoints = 1000 // Since we know we add 1000 points each time
            addMessage(`Point cloud updated - ${totalPoints.toLocaleString()} total points (+${newPoints} new)`)
          } catch (error) {
            addMessage(`Point cloud update failed: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }, 5000)
      } catch (error) {
        addMessage(`Point cloud generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsPointCloudGenerating(false)
      } finally {
        setIsLoading(false)
      }
    } else {
      addMessage(`Point cloud generation stopped for ${title}`)

      // Clear polling interval but retain the data
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Save the current point cloud data to server if we have any
      if (pointCloudData) {
        try {
          await savePointCloudToServer(pointCloudData)
          retainedPointCloudRef.current = pointCloudData // Ensure we retain the data
          addMessage("Point cloud data retained for session")
        } catch (error) {
          addMessage(`Failed to save point cloud data: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      // Don't clear pointCloudData here - keep it visible
    }
  }

  // Cleanup on unmount - this is when the dashboard closes
  useEffect(() => {
    return () => {
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      // Delete retained point cloud data from server when component unmounts
      if (retainedPointCloudRef.current) {
        deletePointCloudFromServer().catch((error) => {
          console.error("Failed to delete point cloud data:", error)
        })
      }
    }
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
            className="h-7 px-3 text-xs bg-green-600 text-white hover:bg-green-700 border-green-600 hover:text-white"
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
            className={`h-7 px-3 text-xs ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            } bg-green-600 text-white hover:bg-green-700`}
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
                  <p>Loading point cloud data...</p>
                </div>
              ) : (
                <div className="h-full bg-gray-900 rounded relative">
                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 z-10 text-xs text-cyan-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    {isPointCloudGenerating ? "● SCANNING" : pointCloudData ? "● RETAINED" : "○ IDLE"}
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
                      {!isPointCloudGenerating && <p className="text-blue-400">Status: Retained</p>}
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
