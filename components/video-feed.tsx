"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plug, PlugZap, Video, VideoOff, X } from "lucide-react"

interface VideoFeedProps {
  title: string
  executablePath: string
  onMessage: (message: string) => void
}

export default function VideoFeed({ title, executablePath, onMessage }: VideoFeedProps) {
  const [isDroneConnected, setIsDroneConnected] = useState(false)
  const [isVideoFeedOn, setIsVideoFeedOn] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const handleDroneConnection = () => {
    const newConnectionState = !isDroneConnected
    setIsDroneConnected(newConnectionState)

    if (newConnectionState) {
      onMessage(`Drone connected via ${title}`)
    } else {
      onMessage(`Drone disconnected from ${title}`)
      // Turn off video feed when disconnecting
      if (isVideoFeedOn) {
        setIsVideoFeedOn(false)
        onMessage(`Video feed disabled - drone disconnected`)
      }
    }
  }

  const handleVideoFeedToggle = () => {
    if (!isDroneConnected) {
      onMessage("Cannot toggle video feed - drone not connected")
      return
    }

    const newVideoState = !isVideoFeedOn
    setIsVideoFeedOn(newVideoState)

    if (newVideoState) {
      onMessage(`Video feed enabled from ${title}`)
    } else {
      onMessage(`Video feed disabled from ${title}`)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 bg-gray-50">
        <CardTitle className="text-sm font-medium text-green-600">Live Drone Video Feed</CardTitle>
        <div className="flex space-x-2">
          {/* Drone Connection Button */}
          <Button
            variant={isDroneConnected ? "destructive" : "default"}
            size="sm"
            onClick={handleDroneConnection}
            className="h-7 px-3 text-xs"
          >
            {isDroneConnected ? (
              <>
                <PlugZap className="h-3 w-3 mr-1" />
                Disconnect
              </>
            ) : (
              <>
                <Plug className="h-3 w-3 mr-1" />
                Connect
              </>
            )}
          </Button>

          {/* Video Feed Toggle Button */}
          <Button
            variant={isVideoFeedOn ? "default" : "outline"}
            size="sm"
            onClick={handleVideoFeedToggle}
            disabled={!isDroneConnected}
            className={`h-7 px-3 text-xs ${!isDroneConnected ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isVideoFeedOn ? (
              <>
                <Video className="h-3 w-3 mr-1" />
                Video Feed On
              </>
            ) : (
              <>
                <VideoOff className="h-3 w-3 mr-1" />
                Video Feed Off
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
        <div className="bg-black text-green-400 h-full p-4 font-mono text-sm overflow-auto">
          {!isDroneConnected && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="mb-2">Drone not connected</p>
              <p className="text-xs text-gray-500">Click Connect to establish drone connection</p>
            </div>
          )}

          {isDroneConnected && !isVideoFeedOn && (
            <div className="h-full">
              <div className="border border-gray-700 h-full p-4 flex flex-col items-center justify-center">
                <p className="mb-4">Drone connected - Video feed disabled</p>
                <p className="text-xs text-gray-500 text-center">
                  Enable video feed to view live camera stream from drone
                </p>
                <div className="mt-4 text-xs">
                  <p>
                    Connection Status: <span className="text-green-400">ACTIVE</span>
                  </p>
                  <p>
                    Signal Quality: <span className="text-green-400">STRONG</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDroneConnected && isVideoFeedOn && (
            <div className="h-full">
              <div className="border border-gray-700 h-full p-2 bg-gray-900">
                <div className="h-full bg-black rounded flex flex-col items-center justify-center relative">
                  {/* Simulated video feed */}
                  <div className="absolute top-2 left-2 text-xs text-red-500 bg-black bg-opacity-75 px-2 py-1 rounded">
                    ● LIVE
                  </div>
                  <div className="absolute top-2 right-2 text-xs text-green-400 bg-black bg-opacity-75 px-2 py-1 rounded">
                    1080p
                  </div>

                  {/* Video feed placeholder */}
                  <div className="text-center">
                    <p className="text-green-400 mb-2">📹 DRONE CAMERA FEED</p>
                    <p className="text-xs text-gray-400">Live video stream from drone camera</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500">Resolution:</p>
                        <p className="text-green-400">1920x1080</p>
                      </div>
                      <div>
                        <p className="text-gray-500">FPS:</p>
                        <p className="text-green-400">30</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bitrate:</p>
                        <p className="text-green-400">5.2 Mbps</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Latency:</p>
                        <p className="text-green-400">120ms</p>
                      </div>
                    </div>
                  </div>

                  {/* Crosshair overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 border border-green-400 opacity-50">
                      <div className="absolute top-1/2 left-0 w-full h-px bg-green-400 opacity-50"></div>
                      <div className="absolute left-1/2 top-0 w-px h-full bg-green-400 opacity-50"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
