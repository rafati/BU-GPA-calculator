'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAI } from '@/hooks/useAI';
import { isAIEnabled } from '@/lib/ai-config';
import { StudentContext } from '@/lib/ai-service';

// Message type definition
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  studentContext?: StudentContext;
  initialMessage?: string;
  className?: string;
  minimal?: boolean; // If true, shows a more compact view
}

export default function AIChatInterface({
  studentContext,
  initialMessage = "I'm your academic advisor assistant. How can I help you with your GPA calculations and course planning?",
  className = '',
  minimal = false
}: AIChatInterfaceProps) {
  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // AI hook
  const { query, isLoading, error } = useAI();
  
  // Add initial message when component mounts
  useEffect(() => {
    if (initialMessage) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: initialMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, [initialMessage]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Check if AI is enabled
  const aiEnabled = isAIEnabled();
  
  // Toggle chat interface
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    
    // Focus input when opening
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Handle input submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      // Call AI API
      const response = await query(input, studentContext);
      
      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Add error message
      const errorMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [input, isLoading, query, studentContext]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  // If AI is disabled, don't render anything
  if (!aiEnabled) {
    return null;
  }
  
  // Render chat interface
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat button */}
      <button
        onClick={toggleChat}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
      
      {/* Chat interface */}
      {isOpen && (
        <div className={`absolute ${minimal ? 'w-80' : 'w-96'} right-0 bottom-16 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="bg-purple-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-medium">Academic Advisor Assistant</h3>
            <button 
              onClick={toggleChat}
              className="text-white hover:text-gray-200"
              aria-label="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-96 bg-gray-50">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`mb-3 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div 
                  className={`inline-block p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.role === 'system' 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center items-center mt-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
            <div className="flex">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your GPA..."
                className="flex-1 resize-none border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`bg-purple-600 text-white px-4 rounded-r-lg ${
                  isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            
            {/* Suggested questions */}
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setInput("What grades do I need this semester to reach a 3.0 GPA?");
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full"
              >
                How can I reach a 3.0 GPA?
              </button>
              <button
                type="button"
                onClick={() => {
                  setInput("Which courses should I focus on to improve my GPA?");
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full"
              >
                Which courses to focus on?
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 