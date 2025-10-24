'use client';

import type React from "react";

import { createContext, useContext, useState, type ReactNode, useRef } from "react";

// Define the type for dashboard messages to include a timestamp
export interface DashboardMessage {
  content: string;
  timestamp: Date;
}

// Define the telemetry data structure
export interface TelemetryData {
  type: string;
  timestamp: number;
  armed: boolean;
  flight_mode: string;
  battery_percent: number;
  gps_fix_type: string;
  gps_satellites: number;
  health_all_ok: boolean;
  position_relative: {
    x_m: number;
    y_m: number;
    z_m: number;
  };
  altitude_m: number;
  velocity_ms: number;
  heading_deg: number;
  is_in_air: boolean;
}

interface DashboardMessagesContextType {
  messages: DashboardMessage[];
  addMessage: (content: string) => void;
  telemetry: TelemetryData | null;
  setTelemetry: (data: TelemetryData) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  sendWebSocketMessage: (message: string) => boolean;
}

const DashboardMessagesContext = createContext<DashboardMessagesContextType | undefined>(undefined);

export const DashboardMessagesProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<DashboardMessage[]>([
    { content: "Dashboard initialized", timestamp: new Date() },
    { content: "Waiting for user interaction...", timestamp: new Date() },
  ]);
  
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const addMessage = (content: string) => {
    // This logic to filter messages seems important from page.tsx
    if (
      content === "Server response complete" ||
      (!content.includes("first response line") &&
        !content.includes("second response line") &&
        !content.includes("Received response line"))
    ) {
      setMessages((prev) => [...prev, { content, timestamp: new Date() }]);
    }
  };

  const sendWebSocketMessage = (message: string): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(message)
        return true
      } catch (error) {
        addMessage(`Failed to send WebSocket message: ${error instanceof Error ? error.message : "Unknown error"}`)
        return false
      }
    } else {
      addMessage("Cannot send message - WebSocket not connected")
      return false
    }
  }

  return (
    <DashboardMessagesContext.Provider value={{ messages, addMessage, telemetry, setTelemetry, wsRef, sendWebSocketMessage }}>
      {children}
    </DashboardMessagesContext.Provider>
  );
};

export const useDashboardMessages = () => {
  const context = useContext(DashboardMessagesContext);
  if (context === undefined) {
    throw new Error('useDashboardMessages must be used within a DashboardMessagesProvider');
  }
  return context;
};
