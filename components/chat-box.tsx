"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Plug, PlugZap } from "lucide-react"

interface ChatBoxProps {
  serverUrl: string
  onMessage: (message: string) => void
}

interface ChatMessage {
  id: number
  sender: "user" | "server"
  content: string
  timestamp: Date
  showTimestamp?: boolean
  isComplete?: boolean
}

export default function ChatBox({ serverUrl: initialServerUrl, onMessage }: ChatBoxProps) {
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
      isComplete: true,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleConnect = async () => {
    if (isConnected) {
      // Disconnect
      setIsConnected(false)
      setConnectionStatus("disconnected")
      onMessage("Disconnected from server")

      // Add disconnect message to chat
      const disconnectMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: "Disconnected from server",
        timestamp: new Date(),
        showTimestamp: true,
        isComplete: true,
      }
      setMessages((prev) => [...prev, disconnectMessage])
    } else {
      // Connect
      try {
        setConnectionStatus("connected")
        onMessage(`Attempting to connect to ${serverUrl}`)

        // Test connection with a simple ping or health check
        const testResponse = await fetch(`${serverUrl}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (testResponse.ok) {
          setIsConnected(true)
          setConnectionStatus("connected")
          onMessage(`Successfully connected to ${serverUrl}`)

          // Add connection success message to chat
          const connectMessage: ChatMessage = {
            id: Date.now(),
            sender: "server",
            content: `Connected to ${serverUrl}`,
            timestamp: new Date(),
            showTimestamp: true,
            isComplete: true,
          }
          setMessages((prev) => [...prev, connectMessage])
        } else {
          throw new Error(`Server responded with status: ${testResponse.status}`)
        }
      } catch (error) {
        setIsConnected(false)
        setConnectionStatus("error")
        const errorMessage = error instanceof Error ? error.message : "Connection failed"
        onMessage(`Connection failed: ${errorMessage}`)

        // Add connection error message to chat
        const errorChatMessage: ChatMessage = {
          id: Date.now(),
          sender: "server",
          content: `Connection failed: ${errorMessage}\n\nPlease check that the server is running and accessible.`,
          timestamp: new Date(),
          showTimestamp: true,
          isComplete: true,
        }
        setMessages((prev) => [...prev, errorChatMessage])
      }
    }
  }

  const handleServerUrlChange = (newUrl: string) => {
    setServerUrl(newUrl)
    if (isConnected) {
      setIsConnected(false)
      setConnectionStatus("disconnected")
      onMessage("Disconnected due to server URL change")
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    if (!isConnected) {
      onMessage("Cannot send message - not connected to server")
      const errorMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: "Error: Not connected to server. Please connect first.",
        timestamp: new Date(),
        showTimestamp: true,
        isComplete: true,
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
      isComplete: true,
    }

    setMessages((prev) => [...prev, userMessage])
    onMessage(`User sent: ${input}`)
    const userInput = input
    setInput("")
    setIsLoading(true)

    try {
      // Send message to the server
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      // Create initial server response bubble
      const initialServerMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: "",
        timestamp: new Date(),
        showTimestamp: false,
        isComplete: false,
      }

      setMessages((prev) => [...prev, initialServerMessage])

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body reader available")
      }

      const decoder = new TextDecoder()
      let accumulatedContent = ""
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue

            const isComplete = trimmedLine === "Response complete"

            if (accumulatedContent) {
              accumulatedContent += "\n\n" + trimmedLine
            } else {
              accumulatedContent = trimmedLine
            }

            setMessages((prev) => {
              const updated = [...prev]
              const lastMessage = updated[updated.length - 1]
              if (lastMessage.sender === "server" && !lastMessage.isComplete) {
                lastMessage.content = accumulatedContent
                if (isComplete) {
                  lastMessage.showTimestamp = true
                  lastMessage.isComplete = true
                  lastMessage.timestamp = new Date()
                }
              }
              return updated
            })

            if (isComplete) {
              setIsLoading(false)
              onMessage("Server response complete")
              break
            }
          }
        }
      }
    } catch (error) {
      setIsLoading(false)
      setConnectionStatus("error")
      setIsConnected(false)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      onMessage(`Communication error: ${errorMessage}`)

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: Date.now(),
        sender: "server",
        content: `Error: ${errorMessage}\n\nConnection lost. Please reconnect to continue.`,
        timestamp: new Date(),
        showTimestamp: true,
        isComplete: true,
      }

      setMessages((prev) => {
        // Remove the incomplete message if it exists
        const filtered = prev.filter((msg) => msg.isComplete !== false)
        return [...filtered, errorChatMessage]
      })
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "error":
        return "Connection Error"
      default:
        return "Disconnected"
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-sm font-medium text-green-600">Agentic AI Chat Interface</CardTitle>
          <div className={`text-xs ${getConnectionStatusColor()}`}>
            <span className="inline-block w-2 h-2 rounded-full bg-current mr-1"></span>
            {getConnectionStatusText()}
          </div>
        </div>

        {/* Server URL and Connection Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center space-x-2">
            <span className="text-xs text-gray-500">Server:</span>
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
                className="text-xs h-6 px-2"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingServer(true)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                disabled={isConnected}
              >
                {serverUrl}
              </button>
            )}
          </div>

          <Button
            onClick={handleConnect}
            size="sm"
            variant={isConnected ? "destructive" : "default"}
            className="h-6 px-3 text-xs"
            disabled={isLoading}
          >
            {isConnected ? (
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
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-3 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.sender === "user"
                    ? "bg-blue-500 text-white"
                    : message.content.includes("Response complete")
                      ? "bg-green-200 text-green-800 border border-green-300"
                      : message.content.includes("Error:") || message.content.includes("Connection failed")
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : message.content.includes("Connected to") || message.content.includes("Disconnected")
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
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

      <CardFooter className="p-3 border-t">
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
            disabled={isLoading || !isConnected}
            className={isLoading || !isConnected ? "bg-gray-100" : ""}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !isConnected}
            className={isLoading || !isConnected ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
