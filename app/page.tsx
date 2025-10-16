"use client"

import VideoFeed from "@/components/video-feed"
import TwinViewer from "@/components/foxglove-twin-viewer"
import ChatBox from "@/components/chat-box"
import StatusBox from "@/components/status-box"
import { DashboardMessagesProvider } from "@/contexts/DashboardMessagesContext"

function DashboardContent() {
  const langGraphUrl = process.env.NEXT_PUBLIC_LANGGRAPH_URL || ""
  if (!langGraphUrl) {
    throw new Error("NEXT_PUBLIC_LANGGRAPH_URL is not set")
  }
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <h1 className="text-2xl font-bold mb-4 text-green-400">ARES Control Panel</h1>

      <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-120px)]">
        {/* Top-left: Video Feed - 50% width, 50% height */}
        <VideoFeed title="Live Drone Video Feed" executablePath="test1.exe" />

        {/* Top-right: Digital Twin Display - 50% width, 50% height */}
        <TwinViewer />

        {/* Bottom-left: Chat interface - 50% width, 50% height */}
        <ChatBox serverUrl={langGraphUrl} />

        {/* Bottom-right: Status Box - 50% width, 50% height */}
        <StatusBox />
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <DashboardMessagesProvider>
      <DashboardContent />
    </DashboardMessagesProvider>
  )
}
