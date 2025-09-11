"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Battery, Wifi, Shield, ShieldCheck } from "lucide-react"

// Define the type for dashboard messages to include a timestamp
interface DashboardMessage {
  content: string
  timestamp: Date
}

interface StatusBoxProps {
  messages: DashboardMessage[]
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
    if (level > 50) return "text-green-400"
    if (level > 20) return "text-yellow-400"
    return "text-red-600"
  }

  const getSignalColor = (strength: number) => {
    if (strength > 70) return "text-green-400"
    if (strength > 40) return "text-yellow-400"
    return "text-red-600"
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 bg-gray-800 flex-shrink-0">
        <CardTitle className="text-sm font-medium text-green-400">System Messages and Telemetry</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4">
            {messages.map((message, index) => (
              <div key={index} className="mb-2 text-xs">
                {" "}
                {/* Reduced font size here */}
                <span suppressHydrationWarning className="text-gray-400">[{message.timestamp.toLocaleTimeString()}]</span>{" "}
                <span>{message.content}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-2 flex-shrink-0 bg-gray-800">
        <div className="flex items-center justify-between h-full w-full">
          {/* Manual Override Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={handleManualOverride}
              variant={manualOverride ? "destructive" : "default"}
              className="h-9 px-3 text-xs font-medium bg-green-600 text-white hover:bg-green-700"
            >
              Manual Override
              {manualOverride && <span className="ml-1 text-xs">(ON)</span>}
            </Button>
            <div className="text-xs text-gray-400">Status: {manualOverride ? "ACTIVE" : "STANDBY"}</div>
          </div>

          {/* Drone Telemetry */}
          <div className="flex flex-col items-center space-y-0.5">
            <div className={`text-xs font-medium ${manualOverride ? "text-gray-400" : "text-gray-500"}`}>
              Drone Telemetry
            </div>

            {/* Armed Status */}
            <div className="flex items-center space-x-1">
              <div className="flex items-center space-x-0.5">
                {telemetry.armed ? (
                  <ShieldCheck className="h-3 w-3 text-red-600" />
                ) : (
                  <Shield className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs font-medium ${telemetry.armed ? "text-red-600" : "text-gray-500"}`}>
                  {telemetry.armed ? "ARMED" : "DISARMED"}
                </span>
              </div>

              {/* Battery */}
              <div className="flex items-center space-x-0.5">
                <Battery className={`h-3 w-3 ${getBatteryColor(telemetry.batteryLife)}`} />
                <span className={`text-xs font-mono ${getBatteryColor(telemetry.batteryLife)}`}>
                  {telemetry.batteryLife.toFixed(0)}%
                </span>
              </div>

              {/* Signal */}
              <div className="flex items-center space-x-0.5">
                <Wifi className={`h-3 w-3 ${getSignalColor(telemetry.signalStrength)}`} />
                <span className={`text-xs font-mono ${getSignalColor(telemetry.signalStrength)}`}>
                  {telemetry.signalStrength.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Flight Data Display */}
          <div className="text-xs text-gray-400 text-center space-y-0.5">
            <div className="font-medium text-xs">Flight Data</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-gray-500">Altitude</span>
                <span
                  className={`font-mono px-1 py-0.5 rounded ${
                    manualOverride ? "bg-blue-800 text-blue-200" : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {telemetry.altitude.toFixed(1)}m
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500">Velocity</span>
                <span
                  className={`font-mono px-1 py-0.5 rounded ${
                    manualOverride ? "bg-blue-800 text-blue-200" : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {telemetry.velocity.toFixed(1)} m/s
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
