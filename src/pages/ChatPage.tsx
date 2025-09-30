import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import FinancialHealthScoreCard from '@/components/FinancialHealthScoreCard';
import AddDataModal from '@/components/AddDataModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: React.ReactNode[];
  quickReplies?: string[];
}

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
);

const ChatPage = () => {
  const { userDisplayName, isLoading: sessionLoading } = useSession();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (!sessionLoading && userDisplayName) {
      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: `Hello ${userDisplayName}! I'm KudiGuard, your AI financial analyst. How can I help your business today?`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Check my financial health', 'Should I hire someone?', 'Add new data'],
        },
      ]);
    }
  }, [sessionLoading, userDisplayName]);

  const handleSendMessage = () => {
    if (messageInput.trim() === '') return;

    const newMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: messageInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      const aiResponseText = `That's a great question, ${userDisplayName || 'Vendor'}! Based on your current data, here's a quick look at your business health.`;
      const responseWords = aiResponseText.split(' ');
      
      const newAiMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAiMessage]);

      let wordIndex = 0;
      const intervalId = setInterval(() => {
        if (wordIndex < responseWords.length) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAiMessage.id ? { ...msg, text: `${msg.text} ${responseWords[wordIndex]}`.trim() } : msg
            )
          );
          wordIndex++;
        } else {
          clearInterval(intervalId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAiMessage.id
                ? {
                    ...msg,
                    cards: [
                      <FinancialHealthScoreCard
                        key="health-score-card"
                        score="caution"
                        message="Your business shows some areas for improvement. Let's review your recent expenses."
                      />,
                    ],
                    quickReplies: ['Tell me more', 'Decision History', 'Insights'],
                  }
                : msg
            )
          );
          setIsAiTyping(false);
        }
      }, 100);
    }, 1000);
  };

  const handleQuickReply = (reply: string) => {
    if (reply.toLowerCase() === 'add new data') {
      setIsAddDataModalOpen(true);
    } else {
      const newMessage: ChatMessage = {
        id: String(Date.now()),
        sender: 'user',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setIsAiTyping(true);
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: `Okay, let's look at your ${reply.toLowerCase()}.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        setIsAiTyping(false);
      }, 1000);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col flex-1">
        <header className="bg-card shadow-card border-b border-border p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-primary">KudiGuard Analyst</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.cards && <div className="mt-2">{msg.cards}</div>}
                {msg.quickReplies && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.quickReplies.map((reply, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-1 text-right ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-3 rounded-lg bg-card text-foreground border">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-card border-t border-border p-4 flex items-center flex-shrink-0">
          <Input
            type="text"
            placeholder="Ask KudiGuard a question..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 mr-2 h-12"
            disabled={isAiTyping}
          />
          <Button onClick={handleSendMessage} className="bg-gradient-primary h-12" disabled={isAiTyping}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <AddDataModal isOpen={isAddDataModalOpen} onClose={() => setIsAddDataModalOpen(false)} />
    </>
  );
};

export default ChatPage;