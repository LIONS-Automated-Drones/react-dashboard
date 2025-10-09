"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Battery, Wifi, Shield, ShieldCheck } from "lucide-react"
import { useDashboardMessages } from "@/contexts/DashboardMessagesContext"

export default function StatusBox() {
  const { messages, addMessage, telemetry } = useDashboardMessages()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [manualOverride, setManualOverride] = useState(false)

  // No more fake telemetry simulation - using real data from WebSocket

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
    addMessage(`Manual Override ${newOverrideState ? "ENABLED" : "DISABLED"}`)


    if (newOverrideState) {
      addMessage("Drone armed - Manual control active")
    } else {
      addMessage("Drone disarmed - Returning to autonomous mode")
    }
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-400"
    if (level > 20) return "text-yellow-400"
    return "text-red-600"
  }

  const getGpsColor = (fixType: string, satellites: number) => {
    if (fixType === "FIX_3D" && satellites >= 6) return "text-green-400"
    if (fixType === "FIX_2D" || (fixType === "FIX_3D" && satellites >= 4)) return "text-yellow-400"
    return "text-red-600"
  }

  const getFlightModeColor = (mode: string) => {
    if (mode === "MANUAL" || mode === "OFFBOARD") return "text-blue-400"
    if (mode === "MISSION" || mode === "TAKEOFF") return "text-green-400"
    if (mode === "LAND" || mode === "RETURN_TO_LAUNCH") return "text-yellow-400"
    return "text-gray-400"
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
            <div className="text-xs font-medium text-gray-400">
              Drone Telemetry
            </div>

            {/* Top Row: Armed, Flight Mode, Health */}
            <div className="flex items-center space-x-1">
              {/* Armed Status */}
              <div className="flex items-center space-x-0.5">
                {telemetry?.armed ? (
                  <ShieldCheck className="h-3 w-3 text-red-600" />
                ) : (
                  <Shield className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs font-medium ${telemetry?.armed ? "text-red-600" : "text-gray-500"}`}>
                  {telemetry?.armed ? "ARMED" : "DISARMED"}
                </span>
              </div>

              {/* Flight Mode */}
              <div className="flex items-center space-x-0.5">
                <span className={`text-xs font-medium ${getFlightModeColor(telemetry?.flight_mode || "")}`}>
                  {telemetry?.flight_mode}
                </span>
              </div>

              {/* Health Status */}
              <div className="flex items-center space-x-0.5">
                <div className={`w-2 h-2 rounded-full ${telemetry?.health_all_ok ? "bg-green-400" : "bg-red-600"}`}></div>
                <span className={`text-xs font-medium ${telemetry?.health_all_ok ? "text-green-400" : "text-red-600"}`}>
                  {telemetry?.health_all_ok ? "HEALTHY" : "ERROR"}
                </span>
              </div>
            </div>

            {/* Bottom Row: Battery, GPS */}
            <div className="flex items-center space-x-1">
              {/* Battery */}
              <div className="flex items-center space-x-0.5">
                <Battery className={`h-3 w-3 ${getBatteryColor(telemetry?.battery_percent || 0)}`} />
                <span className={`text-xs font-mono ${getBatteryColor(telemetry?.battery_percent || 0)}`}>
                  {telemetry?.battery_percent.toFixed(0)}%
                </span>
              </div>

              {/* GPS Status */}
              <div className="flex items-center space-x-0.5">
                <Wifi className={`h-3 w-3 ${getGpsColor(telemetry?.gps_fix_type || "", telemetry?.gps_satellites || 0)}`} />
                <span className={`text-xs font-mono ${getGpsColor(telemetry?.gps_fix_type || "", telemetry?.gps_satellites || 0)}`}>
                  {telemetry?.gps_fix_type} ({telemetry?.gps_satellites})
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
                <span className="font-mono px-1 py-0.5 rounded bg-gray-700 text-gray-400">
                  {telemetry?.altitude_m.toFixed(1)}m
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500">Velocity</span>
                <span className="font-mono px-1 py-0.5 rounded bg-gray-700 text-gray-400">
                  {telemetry?.velocity_ms.toFixed(1)} m/s
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500">Position X</span>
                <span className="font-mono px-1 py-0.5 rounded bg-gray-700 text-gray-400">
                  {telemetry?.position_relative.x_m.toFixed(1)}m
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500">Position Y</span>
                <span className="font-mono px-1 py-0.5 rounded bg-gray-700 text-gray-400">
                  {telemetry?.position_relative.y_m.toFixed(1)}m
                </span>
              </div>
            </div>
            <div suppressHydrationWarning className="text-xs text-gray-500 mt-1">
              Last Updated: {Math.floor((Date.now() - new Date(telemetry?.timestamp || 0).getTime()) / 1000)}s ago
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
