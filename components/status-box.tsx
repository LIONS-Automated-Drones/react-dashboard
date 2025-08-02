"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Battery, Wifi, Shield, ShieldCheck } from "lucide-react"

// Define the type for dashboard messages to include a timestamp
interface DashboardMessage {
  content: string
  timestamp: Date
}

interface StatusBoxProps {
  // Renamed interface
  messages: DashboardMessage[] // Updated prop type
  onMessage: (message: string) => void
}

interface DroneTelemetry {
  armed: boolean
  altitude: number
  velocity: number
  batteryLife: number
  signalStrength: number
}

export default function StatusBox({ messages, onMessage }: StatusBoxProps) {
  // Renamed component
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [manualOverride, setManualOverride] = useState(false)
  const [telemetry, setTelemetry] = useState<DroneTelemetry>({
    armed: false,
    altitude: 0.0,
    velocity: 0.0,
    batteryLife: 85,
    signalStrength: 92,
  })

  // Simulate telemetry updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        altitude: manualOverride ? prev.altitude + (Math.random() - 0.5) * 2 : Math.max(0, prev.altitude - 0.1),
        velocity: manualOverride ? Math.random() * 15 : Math.max(0, prev.velocity - 0.2),
        batteryLife: Math.max(0, prev.batteryLife - (manualOverride ? 0.02 : 0.005)),
        signalStrength: Math.max(0, Math.min(100, prev.signalStrength + (Math.random() - 0.5) * 5)),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [manualOverride])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }, 0)
      }
    }
  }, [messages])

  const handleManualOverride = () => {
    const newOverrideState = !manualOverride
    setManualOverride(newOverrideState)
    onMessage(`Manual Override ${newOverrideState ? "ENABLED" : "DISABLED"}`)

    // Update drone armed status based on manual override
    setTelemetry((prev) => ({
      ...prev,
      armed: newOverrideState,
    }))

    if (newOverrideState) {
      onMessage("Drone armed - Manual control active")
    } else {
      onMessage("Drone disarmed - Returning to autonomous mode")
    }
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600"
    if (level > 20) return "text-yellow-600"
    return "text-red-600"
  }

  const getSignalColor = (strength: number) => {
    if (strength > 70) return "text-green-600"
    if (strength > 40) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message Box - Fixed height calculation */}
      <Card className="flex flex-col h-[calc(100%-140px)]">
        <CardHeader className="p-3 bg-gray-50 flex-shrink-0">
          <CardTitle className="text-sm font-medium text-green-600">System Messages and Telemetry</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4">
              {messages.map((message, index) => (
                <div key={index} className="mb-2 text-sm">
                  <span className="text-gray-500">[{message.timestamp.toLocaleTimeString()}]</span>{" "}
                  <span>{message.content}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Control Bar with Drone Telemetry - Increased fixed height */}
      <Card className="h-32 mt-2 flex-shrink-0">
        <CardContent className="p-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Manual Override Button */}
            <div className="flex flex-col items-center space-y-2">
              <Button
                onClick={handleManualOverride}
                variant={manualOverride ? "destructive" : "default"}
                className="h-14 px-6 text-sm font-medium"
              >
                Manual Override
                {manualOverride && <span className="ml-2 text-xs">(ON)</span>}
              </Button>
              <div className="text-xs text-gray-600">Status: {manualOverride ? "ACTIVE" : "STANDBY"}</div>
            </div>

            {/* Drone Telemetry */}
            <div className="flex flex-col items-center space-y-2">
              <div className={`text-xs font-medium ${manualOverride ? "text-gray-600" : "text-gray-400"}`}>
                Drone Telemetry
              </div>

              {/* Armed Status */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {telemetry.armed ? (
                    <ShieldCheck className="h-4 w-4 text-red-600" />
                  ) : (
                    <Shield className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={`text-xs font-medium ${telemetry.armed ? "text-red-600" : "text-gray-400"}`}>
                    {telemetry.armed ? "ARMED" : "DISARMED"}
                  </span>
                </div>

                {/* Battery */}
                <div className="flex items-center space-x-1">
                  <Battery className={`h-4 w-4 ${getBatteryColor(telemetry.batteryLife)}`} />
                  <span className={`text-xs font-mono ${getBatteryColor(telemetry.batteryLife)}`}>
                    {telemetry.batteryLife.toFixed(0)}%
                  </span>
                </div>

                {/* Signal */}
                <div className="flex items-center space-x-1">
                  <Wifi className={`h-4 w-4 ${getSignalColor(telemetry.signalStrength)}`} />
                  <span className={`text-xs font-mono ${getSignalColor(telemetry.signalStrength)}`}>
                    {telemetry.signalStrength.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Flight Data Display */}
            <div className="text-sm text-gray-600 text-center space-y-1">
              <div className="font-medium text-xs">Flight Data</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col items-center">
                  <span className="text-gray-500">Altitude</span>
                  <span
                    className={`font-mono px-2 py-1 rounded ${
                      manualOverride ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {telemetry.altitude.toFixed(1)}m
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-500">Velocity</span>
                  <span
                    className={`font-mono px-2 py-1 rounded ${
                      manualOverride ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {telemetry.velocity.toFixed(1)} m/s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
