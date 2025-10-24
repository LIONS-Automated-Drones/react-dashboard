"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Plug, PlugZap } from 'lucide-react'
import { useDashboardMessages } from "@/contexts/DashboardMessagesContext"
import { eventBus } from "@/lib/eventBus"

interface ChatBoxProps {
  serverUrl: string
}

interface ChatMessage {
  id: number
  sender: "user" | "server"
  content: string
  timestamp: Date
  showTimestamp: boolean
}

export default function ChatBox({ serverUrl: initialServerUrl }: ChatBoxProps) {
  const { addMessage, setTelemetry, wsRef, manualOverride } = useDashboardMessages()
  const [input, setInput] = useState("")
  const [serverUrl, setServerUrl] = useState(initialServerUrl)
  const [isEditingServer, setIsEditingServer] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "server",
      content: "Welcome to the ARES Drone Control Dashboard!",
      timestamp: new Date(),
      showTimestamp: false,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting" | "error">("disconnected")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Convert HTTP URL to WebSocket URL
  const getWebSocketUrl = (httpUrl: string): string => {
    try {
      const url = new URL(httpUrl)
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${url.host}`
    } catch (error) {
      // Fallback for relative URLs or malformed URLs
      const cleanUrl = httpUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
      return `ws://${cleanUrl}`
    }
  }

  // Setup WebSocket connection
  const connectWebSocket = () => {
    reconnectTimeoutRef.current = null
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    // Validate server URL
    if (!serverUrl || serverUrl.trim() === '') {
      setConnectionStatus("error")
      addMessage("Invalid server URL - please enter a valid server address")
      return
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnectionStatus("connecting")
    addMessage(`Attempting WebSocket connection to ${serverUrl}`)

    const wsUrl = getWebSocketUrl(serverUrl)
    
    // Validate the constructed WebSocket URL
    try {
      new URL(wsUrl) // This will throw if the URL is invalid
    } catch (urlError) {
      setConnectionStatus("error")
      const errorMsg = `Invalid WebSocket URL: ${wsUrl}`
      addMessage(errorMsg)
      
      const errorChatMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: `URL Error: ${errorMsg}. Please check the server address format.`,
        timestamp: new Date(),
        showTimestamp: true,
      }
      setMessages((prev) => [...prev, errorChatMessage])
      return
    }
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          setConnectionStatus("error")
          addMessage(`Connection timeout - WebSocket server not responding at ${wsUrl}`)
          
          const timeoutMessage: ChatMessage = {
            id: Date.now(),
            sender: "server",
            content: `Connection timeout: Server at ${serverUrl} is not responding. Please check if the WebSocket server is running.`,
            timestamp: new Date(),
            showTimestamp: true,
          }
          setMessages((prev) => [...prev, timeoutMessage])
        }
      }, 10000) // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        setConnectionStatus("connected")
        reconnectAttemptsRef.current = 0
        addMessage(`WebSocket connected to ${wsUrl}`)

        // Add connection success message to chat
        const connectMessage: ChatMessage = {
          id: Date.now(),
          sender: "server",
          content: `WebSocket connected to ${serverUrl}`,
          timestamp: new Date(),
          showTimestamp: true,
        }
        setMessages((prev) => [...prev, connectMessage])
      }

      ws.onmessage = (event) => {
        try {
          try {
            const parsed = JSON.parse(event.data.toString());
            if (parsed.type === "telemetry") {
              setTelemetry(parsed);
              return; // Don't add telemetry to messages
            }
          } catch {
            // Not JSON, continue with normal message handling
          }
          const messageContent = event.data.toString()
          if (messageContent.includes("SYSTEM NOTE")) {
            return;
          }
          if (messageContent.startsWith("[INFO]")) {
            let trimmed = messageContent.substring(6).trim()
            addMessage(trimmed)
            return
          }
          if (messageContent.startsWith("[COMMAND]") && messageContent.includes("TAKE_PICTURE")) {
            console.log('TAKE_PICTURE command detected, emitting captureScreenshot event');
            eventBus.emit('captureScreenshot');
            return
          }
          const serverMessage: ChatMessage = {
            id: Date.now(),
            sender: "server",
            content: messageContent,
            timestamp: new Date(),
            showTimestamp: true,
          }
          
          setMessages((prev) => [...prev, serverMessage])
          setIsLoading(false)
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
          addMessage(`Error processing server message: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setIsLoading(false)
        }
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        setIsConnected(false)
        setIsLoading(false)
        
        let closeReason = "Unknown reason"
        if (event.code === 1000) closeReason = "Normal closure"
        else if (event.code === 1001) closeReason = "Going away"
        else if (event.code === 1002) closeReason = "Protocol error"
        else if (event.code === 1003) closeReason = "Unsupported data"
        else if (event.code === 1006) closeReason = "Connection lost"
        else if (event.code === 1011) closeReason = "Server error"
        else if (event.code === 1012) closeReason = "Service restart"
        
        if (event.wasClean) {
          setConnectionStatus("disconnected")
          addMessage(`WebSocket connection closed cleanly: ${closeReason} (code: ${event.code})`)
        } else {
          setConnectionStatus("error")
          addMessage(`WebSocket connection lost: ${closeReason} (code: ${event.code})`)
          
          // Attempt to reconnect if not manually disconnected and not a permanent error
          if (reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1002 && event.code !== 1003) {
            reconnectAttemptsRef.current++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000)
            addMessage(`Attempting to reconnect in ${delay / 1000} seconds... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket()
            }, delay)
          } else {
            addMessage("Maximum reconnection attempts reached or permanent error. Please reconnect manually.")
          }
        }

        // Add disconnect message to chat
        const disconnectMessage: ChatMessage = {
          id: Date.now(),
          sender: "server",
          content: event.wasClean 
            ? `WebSocket connection closed: ${closeReason}` 
            : `Connection lost: ${closeReason}. ${reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1002 && event.code !== 1003 ? 'Attempting to reconnect...' : 'Please reconnect manually.'}`,
          timestamp: new Date(),
          showTimestamp: true,
        }
        setMessages((prev) => [...prev, disconnectMessage])
      }

      ws.onerror = (event) => {
        clearTimeout(connectionTimeout)
        
        // WebSocket error events don't contain detailed error information
        // We need to infer the error based on the connection state and timing
        let errorMessage = "WebSocket connection error"
        
        if (ws.readyState === WebSocket.CONNECTING) {
          errorMessage = `Cannot connect to WebSocket server at ${wsUrl}`
        } else if (ws.readyState === WebSocket.OPEN) {
          errorMessage = "WebSocket communication error"
        } else if (ws.readyState === WebSocket.CLOSING) {
          errorMessage = "WebSocket error during connection close"
        } else {
          errorMessage = "WebSocket connection failed"
        }
        
        console.warn('WebSocket error event:', {
          readyState: ws.readyState,
          url: wsUrl,
          timestamp: new Date().toISOString()
        })
        
        setConnectionStatus("error")
        setIsLoading(false)
        addMessage(`${errorMessage} - Check if server is running at ${serverUrl}`)
        
        // Add error message to chat
        const errorChatMessage: ChatMessage = {
          id: Date.now(),
          sender: "server",
          content: `Connection Error: ${errorMessage}. Please verify the server is running and accessible.`,
          timestamp: new Date(),
          showTimestamp: true,
        }
        setMessages((prev) => [...prev, errorChatMessage])
      }

    } catch (error) {
      setConnectionStatus("error")
      const errorMessage = `Failed to create WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      addMessage(errorMessage)
      
      const errorChatMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: `Connection Error: ${errorMessage}`,
        timestamp: new Date(),
        showTimestamp: true,
      }
      setMessages((prev) => [...prev, errorChatMessage])
    }
  }

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect")
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus("disconnected")
    addMessage("WebSocket disconnected")
  }

  const handleConnect = () => {
    if (isConnected) {
      disconnectWebSocket()
    } else {
      reconnectAttemptsRef.current = 0 // Reset reconnect attempts
      connectWebSocket()
    }
  }

  const handleServerUrlChange = (newUrl: string) => {
    setServerUrl(newUrl)
    if (isConnected) {
      disconnectWebSocket()
      addMessage("Disconnected due to server URL change")
    }
  }

  const sendMessage = () => {
    if (!input.trim()) return

    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage("Cannot send message - WebSocket not connected")
      const errorMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: "Error: Not connected to server. Please connect first.",
        timestamp: new Date(),
        showTimestamp: true,
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      content: input,
      timestamp: new Date(),
      showTimestamp: false,
    }

    setMessages((prev) => [...prev, userMessage])
    addMessage(`User sent: ${input}`)
    
    // Send message as plain string through WebSocket
    try {
      wsRef.current.send(input)
      setInput("")
      setIsLoading(true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addMessage(`Failed to send message: ${errorMsg}`)
      setIsLoading(false)
      
      const errorMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: `Error: Failed to send message - ${errorMsg}. Connection may be lost.`,
        timestamp: new Date(),
        showTimestamp: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting")
      }
    }
  }, [])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-400"
      case "connecting":
        return "text-yellow-400"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-400"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "error":
        return "Connection Error"
      default:
        return "Disconnected"
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 bg-gray-800">
        <div className="flex items-center justify-between space-x-4">
          <CardTitle className="text-sm font-medium text-green-400 flex-shrink-0">Chat Interface</CardTitle>
          <div className="flex items-center space-x-4 flex-grow justify-end">
            <span className="text-xs text-gray-400 flex-shrink-0">Server:</span>
            {isEditingServer ? (
              <Input
                value={serverUrl}
                onChange={(e) => handleServerUrlChange(e.target.value)}
                onBlur={() => setIsEditingServer(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingServer(false)
                  }
                }}
                className="text-xs h-6 px-2 w-32 bg-gray-700 text-gray-200 border-gray-600"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingServer(true)}
                className="text-xs text-blue-400 hover:text-blue-200 underline"
                disabled={isConnected}
              >
                {serverUrl}
              </button>
            )}
            <div className={`text-xs ${getConnectionStatusColor()} flex-shrink-0`}>
              <span className="inline-block w-2 h-2 rounded-full bg-current mr-1"></span>
              {getConnectionStatusText()}
            </div>
            <Button
              onClick={handleConnect}
              size="sm"
              variant={isConnected ? "destructive" : "default"}
              disabled={connectionStatus === "connecting" || reconnectTimeoutRef.current != null}
              className="h-6 px-3 text-xs bg-green-600 text-white hover:bg-green-700"
            >
              {isConnected ? (
                <>
                  <PlugZap className="h-3 w-3 mr-1" />
                  Disconnect
                </>
              ) : connectionStatus === "connecting" ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                  Connecting...
                </>
              ) : reconnectTimeoutRef.current != null ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                  Waiting...
                </>
              )
              :  (
                <>
                  <Plug className="h-3 w-3 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.map((message) => (
            <div
              key={message.id + message.content}
              className={`mb-3 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                  message.sender === "user"
                    ? "bg-blue-500 text-white"
                    : message.content.includes("WebSocket connected") || message.content.includes("WebSocket disconnected")
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : message.content.includes("Error:") || message.content.includes("Connection lost") || message.content.includes("Connection Error")
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : message.content.includes("Attempting to reconnect") || message.content.includes("Maximum reconnection")
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                          : "bg-gray-200 text-gray-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.showTimestamp && (
                  <p className="text-xs opacity-70 mt-2 pt-2 border-t border-current border-opacity-20">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-200 text-gray-800 rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 border-t bg-gray-800">
        <div className="flex w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              !isConnected
                ? "Connect to server first..."
                : isLoading
                  ? "Waiting for server response..."
                  : "Type your message..."
            }
            onKeyDown={(e) => !isLoading && isConnected && e.key === "Enter" && sendMessage()}
            disabled={isLoading || !isConnected || manualOverride}
            className={isLoading || !isConnected || manualOverride ? "bg-gray-700 text-gray-400" : "bg-gray-700 text-gray-200"}
          />
          <Button
            onClick={sendMessage}
            variant={manualOverride ? "destructive" : "green"}
            disabled={isLoading || !isConnected || manualOverride}
            className={` ${
              isLoading || !isConnected || manualOverride ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
