import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import AddDataModal from '@/components/AddDataModal';
import DecisionCard from '@/components/DecisionCard'; // Import the new component
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: React.ReactNode[];
  quickReplies?: string[];
  // New field to indicate if AI is asking for specific data
  dataNeeded?: {
    field: string;
    prompt: string;
    intent_context: { intent: string; decision_type: string; };
  };
}

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
);

const ChatPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase } = useSession();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const [pendingDataRequest, setPendingDataRequest] = useState<ChatMessage['dataNeeded'] | null>(null); // New state for pending data
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
          quickReplies: ['Should I hire someone?', 'Add new data'],
        },
      ]);
    }
  }, [sessionLoading, userDisplayName]);

  const sendToDecisionEngine = async (intent: string, decision_type: string, payload?: Record<string, any>) => {
    setIsAiTyping(true);
    try {
      const { data: edgeFunctionResult, error: invokeError } = await supabase.functions.invoke('decision-engine', {
        body: { intent, decision_type, payload },
      });

      if (invokeError) {
        // This handles network errors or issues with invoking the function itself
        throw invokeError;
      }

      // Now, check the 'success' flag from the Edge Function's *response body*
      if (!edgeFunctionResult || !edgeFunctionResult.success) {
        // This means the Edge Function executed, but returned an application-level error
        const errorMessage = edgeFunctionResult?.error?.details || "An unknown error occurred from the AI.";
        throw new Error(errorMessage);
      }

      // Handle case where AI needs more data (this structure is directly from the Edge Function's 'data' field)
      if (edgeFunctionResult.data?.data_needed) {
        setPendingDataRequest(edgeFunctionResult.data.data_needed);
        const dataNeededMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: edgeFunctionResult.data.data_needed.prompt,
          timestamp: new Date().toISOString(),
          dataNeeded: edgeFunctionResult.data.data_needed,
          quickReplies: ['Cancel'],
        };
        setMessages((prev) => [...prev, dataNeededMessage]);
        return;
      }

      // Regular decision response
      const aiResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I've analyzed your financial data. Here is my recommendation:",
        timestamp: new Date().toISOString(),
        cards: [<DecisionCard key="decision-card" data={edgeFunctionResult.data} />],
        quickReplies: ['Thanks!', 'What else can you do?'],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setPendingDataRequest(null); // Clear any pending data requests
    } catch (error: any) {
      console.error("Error invoking edge function:", error);
      let errorMessage = "An unexpected error occurred while analyzing your request.";
      if (error.context?.details) {
        errorMessage = error.context.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const errorResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        quickReplies: ['Add new data', 'Try again'],
      };
      setMessages((prev) => [...prev, errorResponse]);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setPendingDataRequest(null); // Clear any pending data requests on error
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim() === '') return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: messageInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (pendingDataRequest) {
      // If AI is waiting for data, try to parse the input
      if (pendingDataRequest.field === 'estimated_salary') {
        const salaryMatch = messageInput.match(/(\d[\d,\.]*)/); // Extract numbers
        if (salaryMatch && salaryMatch[1]) {
          const estimatedSalary = parseFloat(salaryMatch[1].replace(/,/g, ''));
          if (!isNaN(estimatedSalary) && estimatedSalary >= 0) {
            sendToDecisionEngine(
              pendingDataRequest.intent_context.intent,
              pendingDataRequest.intent_context.decision_type,
              { estimated_salary: estimatedSalary }
            );
            setMessageInput('');
            return;
          }
        }
        // If parsing failed, prompt user again
        const retryMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: "I couldn't understand the salary. Please provide a number for the estimated monthly salary (e.g., '50000').",
          timestamp: new Date().toISOString(),
          quickReplies: ['Cancel'],
        };
        setMessages((prev) => [...prev, retryMessage]);
        setIsAiTyping(false); // Stop typing indicator if it was on
        setMessageInput('');
        return;
      }
      // Handle other pending data requests here if they are added in the future
    }

    // Initial intent detection
    const lowerCaseMessage = messageInput.toLowerCase();
    if (lowerCaseMessage.includes('hire') || lowerCaseMessage.includes('staff') || lowerCaseMessage.includes('employee')) {
      sendToDecisionEngine('hiring', 'hiring_affordability');
    } else {
      const noIntentResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I'm currently specialized in hiring decisions. Please ask me a question like 'Can I afford to hire a new staff member?'.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, noIntentResponse]);
      setIsAiTyping(false);
    }
    setMessageInput('');
  };

  const handleQuickReply = (reply: string) => {
    if (reply.toLowerCase() === 'add new data') {
      setIsAddDataModalOpen(true);
    } else if (reply.toLowerCase() === 'cancel' && pendingDataRequest) {
      setPendingDataRequest(null);
      const cancelMessage: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "Okay, I've cancelled the current data request. How else can I help?",
        timestamp: new Date().toISOString(),
        quickReplies: ['Should I hire someone?', 'Add new data'],
      };
      setMessages((prev) => [...prev, cancelMessage]);
    } else {
      // Treat quick reply as a user message
      setMessageInput(reply);
      // Directly call handleSendMessage to process it
      // This will trigger the logic for pendingDataRequest or initial intent
      setTimeout(() => handleSendMessage(), 0); 
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
            placeholder={pendingDataRequest ? pendingDataRequest.prompt : "Ask about hiring a new staff member..."}
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