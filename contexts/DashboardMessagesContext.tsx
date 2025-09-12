'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for dashboard messages to include a timestamp
export interface DashboardMessage {
  content: string;
  timestamp: Date;
}

interface DashboardMessagesContextType {
  messages: DashboardMessage[];
  addMessage: (content: string) => void;
}

const DashboardMessagesContext = createContext<DashboardMessagesContextType | undefined>(undefined);

export const DashboardMessagesProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<DashboardMessage[]>([
    { content: "Dashboard initialized", timestamp: new Date() },
    { content: "Waiting for user interaction...", timestamp: new Date() },
  ]);

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

  return (
    <DashboardMessagesContext.Provider value={{ messages, addMessage }}>
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
