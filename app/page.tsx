"use client"

import { useState } from "react"
import VideoFeed from "@/components/video-feed"
import DigitalTwin from "@/components/digital-twin"
import ChatBox from "@/components/chat-box"
import StatusBox from "@/components/status-box"

// Define the type for dashboard messages to include a timestamp
interface DashboardMessage {
  content: string
  timestamp: Date
}

export default function Dashboard() {
  const [dashboardMessages, setDashboardMessages] = useState<DashboardMessage[]>([
    { content: "Dashboard initialized", timestamp: new Date() },
    { content: "Waiting for user interaction...", timestamp: new Date() },
  ])

  const addDashboardMessage = (message: string) => {
    // Only add the message if it's the final "Server response complete" message
    // or if it's not related to intermediate response lines
    if (
      message === "Server response complete" ||
      (!message.includes("first response line") &&
        !message.includes("second response line") &&
        !message.includes("Received response line"))
    ) {
      setDashboardMessages((prev) => [...prev, { content: message, timestamp: new Date() }])
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <h1 className="text-2xl font-bold mb-4 text-green-400">ARES Control Panel</h1>

      <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-120px)]">
        {/* Top-left: Video Feed - 50% width, 50% height */}
        <VideoFeed
          title="Live Drone Video Feed"
          executablePath="test1.exe"
          onMessage={(msg) => addDashboardMessage(`Video Feed: ${msg}`)}
        />

        {/* Top-right: Digital Twin Display - 50% width, 50% height */}
        <DigitalTwin
          title="Digital Twin Display"
          videoId="dQw4w9WgXcQ"
          onMessage={(msg) => addDashboardMessage(`Digital Twin: ${msg}`)}
        />

        {/* Bottom-left: Chat interface - 50% width, 50% height */}
        <ChatBox serverUrl="ws://localhost:12345" onMessage={(msg) => addDashboardMessage(`Chat: ${msg}`)} />

        {/* Bottom-right: Status Box - 50% width, 50% height */}
        <StatusBox messages={dashboardMessages} onMessage={addDashboardMessage} />
      </div>
    </div>
  )
}
