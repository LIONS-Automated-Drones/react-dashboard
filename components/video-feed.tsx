"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plug, PlugZap, Video, VideoOff } from "lucide-react"
import { useDashboardMessages } from "@/contexts/DashboardMessagesContext"

// ⬇️ import your stream component
import RosVideoStream from "@/components/ros-camera-stream"

interface VideoFeedProps {
  title: string
  executablePath: string
}

export default function VideoFeed({ title, executablePath }: VideoFeedProps) {
  const { addMessage } = useDashboardMessages()
  const [isVideoFeedOn, setIsVideoFeedOn] = useState(false)
  const handleVideoFeedToggle = () => {
    const newVideoState = !isVideoFeedOn
    setIsVideoFeedOn(newVideoState)
    addMessage(newVideoState ? `Video feed enabled from ${title}` : `Video feed disabled from ${title}`)
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 bg-gray-800">
        <CardTitle className="text-sm font-medium text-green-400">Live Drone Video Feed</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant={isVideoFeedOn ? "default" : "outline"}
            size="sm"
            onClick={handleVideoFeedToggle}
            className={`h-7 px-3 text-xs bg-green-600 text-white hover:bg-green-700 border-green-600 hover:text-white`}
          >
            {isVideoFeedOn ? (
              <>
                <VideoOff className="h-3 w-3 mr-1" />
                Disconnect
              </>
            ) : (
              <>
                <Video className="h-3 w-3 mr-1" />
                Connect
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-2 flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 bg-black rounded overflow-hidden min-h-0">
        {!isVideoFeedOn && (
            <div className="h-full">
              <div className="border border-gray-700 h-full p-4 flex flex-col items-center justify-center">
                <p className="mb-4">Video feed disabled</p>
                <p className="text-xs text-gray-500 text-center">
                  Enable video feed to view live camera stream from drone
                </p>
              </div>
            </div>
          )}
          {isVideoFeedOn && (
            <>
              {/* LIVE badge */}
              <div className="absolute top-2 left-2 text-xs text-red-500 bg-black/75 px-2 py-1 rounded z-10">
                ● LIVE
              </div>

              <RosVideoStream
                className="w-full h-full object-contain"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
