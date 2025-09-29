import React, { useState, useEffect } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';

// Placeholder for chat messages
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: React.ReactNode[]; // For inline visual cards
  quickReplies?: string[]; // For quick action chips
}

const ChatPage = () => {
  const { userDisplayName, isLoading: sessionLoading } = useSession();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!sessionLoading && userDisplayName) {
      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: `Hello ${userDisplayName}! I'm KudiGuard, your AI financial analyst. How can I help your business today?`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Check my financial health', 'Ask a question', 'Add new data'],
        },
      ]);
    }
  }, [sessionLoading, userDisplayName]);

  const handleSendMessage = () => {
    if (messageInput.trim() === '') return;

    const newMessage: ChatMessage = {
      id: String(messages.length + 1),
      sender: 'user',
      text: messageInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageInput('');

    // Simulate AI response (this will be replaced by actual AI integration)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: String(messages.length + 2),
        sender: 'ai',
        text: `That's a great question, ${userDisplayName || 'Vendor'}! I'm still learning to process complex requests, but I can help with common actions.`,
        timestamp: new Date().toISOString(),
        quickReplies: ['Check my financial health', 'Decision History', 'Insights'],
        cards: [
          <FinancialHealthScoreCard 
            key="health-score-card" 
            score="caution" 
            message="Your business shows some areas for improvement. Let's review your recent expenses." 
          />
        ]
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleQuickReply = (reply: string) => {
    setMessageInput(reply);
  };

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <header className="bg-card shadow-card border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <MessageCircle className="h-6 w-6 text-primary mr-3" />
          <h1 className="text-xl font-bold text-primary">KudiGuard Analyst</h1>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              {msg.cards && <div className="mt-2">{msg.cards}</div>}
              {msg.quickReplies && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.quickReplies.map((reply, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary-foreground hover:text-secondary transition-colors"
                      onClick={() => handleQuickReply(reply)}
                    >
                      {reply}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="bg-card border-t border-border p-4 flex items-center flex-shrink-0">
        <Input
          type="text"
          placeholder="Ask KudiGuard a question..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 mr-2 h-12"
        />
        <Button onClick={handleSendMessage} className="bg-gradient-primary h-12">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;