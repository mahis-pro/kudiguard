import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import AddDataModal from '@/components/AddDataModal';
import DecisionCard from '@/components/DecisionCard';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: React.ReactNode[];
  quickReplies?: string[];
  dataNeeded?: {
    field: string;
    prompt: string;
    intent_context: { intent: string; decision_type: string; current_payload?: Record<string, any>; }; // Added current_payload
    canBeZeroOrNone?: boolean; // Added canBeZeroOrNone
  };
  // Store the original question for multi-step data collection
  originalQuestion?: string; 
  // Store collected payload data across steps
  collectedPayload?: Record<string, any>;
}

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
);

const ChatPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, isFmcgVendor } = useSession(); // Get isFmcgVendor
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const [pendingDataRequest, setPendingDataRequest] = useState<ChatMessage['dataNeeded'] | null>(null);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null); // To keep track of the main intent
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null); // To keep track of the original question
  const [currentPayload, setCurrentPayload] = useState<Record<string, any>>({}); // To accumulate payload data
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
          quickReplies: ['Should I hire someone?', 'Should I restock?', 'Add new data'],
        },
      ]);
    }
  }, [sessionLoading, userDisplayName]);

  const sendToDecisionEngine = async (intent: string, question: string, payload?: Record<string, any>) => {
    setIsAiTyping(true);
    try {
      const { data: edgeFunctionResult, error: invokeError } = await supabase.functions.invoke('decision-engine', {
        body: { intent, question, payload },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!edgeFunctionResult || !edgeFunctionResult.success) {
        // Handle specific error codes from the Edge Function
        let errorMessage = "An unknown error occurred from the AI.";
        let quickReplies: string[] = ['Add new data', 'Try again'];

        if (edgeFunctionResult?.error?.code === 'DECISION_NOT_FOUND') {
          errorMessage = "I can't provide a recommendation without your financial data. Please add your monthly revenue, expenses, and savings first.";
          quickReplies = ['Add new data'];
        } else if (edgeFunctionResult?.error?.details) {
          errorMessage = edgeFunctionResult.error.details;
        } else if (edgeFunctionResult?.error?.message) {
          errorMessage = edgeFunctionResult.error.message;
        }
        
        const errorResponse: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          quickReplies: quickReplies,
        };
        setMessages((prev) => [...prev, errorResponse]);
        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setPendingDataRequest(null); // Clear any pending data requests on error
        setCurrentIntent(null);
        setCurrentQuestion(null);
        setCurrentPayload({});
        return; // Exit early after handling the error
      }

      if (edgeFunctionResult.data?.data_needed) {
        // AI needs more data, update pending request and current payload
        setPendingDataRequest(edgeFunctionResult.data.data_needed);
        setCurrentIntent(intent); // Keep track of the original intent
        setCurrentQuestion(question); // Keep track of the original question
        // IMPORTANT: Update currentPayload with the payload sent back by the Edge Function
        // This ensures all previously collected data is preserved.
        setCurrentPayload(edgeFunctionResult.data.data_needed.intent_context.current_payload || {}); 
        
        const dataNeededMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: edgeFunctionResult.data.data_needed.prompt,
          timestamp: new Date().toISOString(),
          dataNeeded: edgeFunctionResult.data.data_needed,
          quickReplies: ['Cancel'],
          originalQuestion: question,
          // The collectedPayload in ChatMessage should reflect the full payload for the next step
          collectedPayload: edgeFunctionResult.data.data_needed.intent_context.current_payload || {}, 
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
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
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
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
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

    if (pendingDataRequest && currentIntent && currentQuestion) {
      // If AI is waiting for data, try to parse the input for the specific field
      let parsedValue: number | boolean | undefined;
      const lowerCaseInput = messageInput.toLowerCase();

      // No boolean fields for current intents, but keep the structure for future expansion
      // if (pendingDataRequest.field === "is_critical_replacement" || 
      //     pendingDataRequest.field === "is_power_solution" ||
      //     pendingDataRequest.field === "has_diversified_revenue_streams" ||
      //     pendingDataRequest.field === "financing_required") {
      //   parsedValue = lowerCaseInput === 'true' || lowerCaseInput === 'yes';
      // } else {
        const valueMatch = messageInput.match(/(\d[\d,\.]*)/); // Extract numbers
        if (valueMatch && valueMatch[1]) {
          parsedValue = parseFloat(valueMatch[1].replace(/,/g, ''));
          if (isNaN(parsedValue) || parsedValue < 0) {
            parsedValue = undefined; // Invalid number
          }
        }
      // }

      if (parsedValue === undefined) {
        const retryMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `I couldn't understand the value. Please provide a valid input for ${pendingDataRequest.field.replace(/_/g, ' ')} (e.g., '50000').`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Cancel'],
        };
        setMessages((prev) => [...prev, retryMessage]);
        setIsAiTyping(false);
        setMessageInput('');
        return;
      }

      // NEW: Check if 0 is allowed for the current field
      if (pendingDataRequest.canBeZeroOrNone === false && parsedValue === 0) {
        const retryMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `The value for ${pendingDataRequest.field.replace(/_/g, ' ')} must be greater than 0. Please provide a valid input.`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Cancel'],
        };
        setMessages((prev) => [...prev, retryMessage]);
        setIsAiTyping(false);
        setMessageInput('');
        return;
      }

      // Accumulate the new data into the current payload
      const updatedPayload = { ...currentPayload, [pendingDataRequest.field]: parsedValue };
      setCurrentPayload(updatedPayload);

      // Re-send to decision engine with accumulated payload
      sendToDecisionEngine(currentIntent, currentQuestion, updatedPayload);
      setMessageInput('');
      return;
    }

    // Initial intent detection
    const lowerCaseMessage = messageInput.toLowerCase();
    let intentDetected: string | null = null;
    let initialPayload: Record<string, any> = {};

    if (lowerCaseMessage.includes('hire') || lowerCaseMessage.includes('staff') || lowerCaseMessage.includes('employee')) {
      intentDetected = 'hiring';
    } else if (lowerCaseMessage.includes('inventory') || lowerCaseMessage.includes('stock') || lowerCaseMessage.includes('restock') || lowerCaseMessage.includes('buy more')) {
      intentDetected = 'inventory';

      // Check for bulk/discount related keywords and extract percentage
      const discountMatch = lowerCaseMessage.match(/(\d+(\.\d+)?)% discount/);
      if (discountMatch && discountMatch[1]) {
        const discount = parseFloat(discountMatch[1]);
        if (!isNaN(discount) && discount >= 0 && discount <= 100) {
          initialPayload.supplier_discount_percentage = discount;
        }
      } else if (lowerCaseMessage.includes('bulk') || lowerCaseMessage.includes('wholesale') || lowerCaseMessage.includes('large quantity')) {
        // If bulk is mentioned but no discount, we can still flag it for potential discount/storage cost questions later
        // For now, we'll just proceed with the inventory intent and let the engine ask for specifics.
        // If a discount is implied but not specified, the engine will ask for it.
      }
    } 
    // Removed equipment intent detection

    if (intentDetected) {
      setCurrentIntent(intentDetected);
      setCurrentQuestion(messageInput);
      setCurrentPayload(initialPayload); // Set initial payload
      sendToDecisionEngine(intentDetected, messageInput, initialPayload);
    } else {
      const noIntentResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I'm currently specialized in hiring and inventory decisions. Please ask me a question like 'Can I afford to hire a new staff member?' or 'Should I restock my shop?'.",
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
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
      const cancelMessage: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "Okay, I've cancelled the current data request. How else can I help?",
        timestamp: new Date().toISOString(),
        quickReplies: ['Should I hire someone?', 'Should I restock?', 'Add new data'],
      };
      setMessages((prev) => [...prev, cancelMessage]);
    } else {
      // Treat quick reply as a user message
      setMessageInput(reply);
      // Directly call handleSendMessage to process it
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
            placeholder={pendingDataRequest ? pendingDataRequest.prompt : "Ask about hiring or restocking..."}
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