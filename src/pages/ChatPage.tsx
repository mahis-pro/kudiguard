import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import AddDataModal from '@/components/AddDataModal';
import DecisionCard from '@/components/DecisionCard';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch'; // Import Switch component
import kudiGuardIcon from '/kudiguard-icon.jpg'; // Import the new icon
import { Textarea } from '@/components/ui/textarea'; // Import Textarea for multi-line input
import { Card } from '@/components/ui/card'; // Import Card component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components

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
    type: 'number' | 'boolean' | 'text_enum'; // Added 'text_enum' type
    options?: string[]; // Added options for 'text_enum'
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

  // New states to store the last query for "Try again" functionality
  const [lastUserQueryText, setLastUserQueryText] = useState<string | null>(null);
  const [lastUserQueryIntent, setLastUserQueryIntent] = useState<string | null>(null);
  const [lastUserQueryPayload, setLastUserQueryPayload] = useState<Record<string, any> | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const initialGreeting = (name: string): ChatMessage => ({ // Explicitly type the return
    id: '1',
    sender: 'ai', // Explicitly 'ai'
    text: `Hello ${name}! I'm KudiGuard, your AI financial analyst. How can I help your business today?`,
    timestamp: new Date().toISOString(),
    quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data', 'What else can you do?'],
  });

  useEffect(() => {
    if (!sessionLoading && userDisplayName) {
      setMessages([initialGreeting(userDisplayName)]);
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
        setPendingDataRequest(null);
        setCurrentIntent(null);
        setCurrentQuestion(null);
        setCurrentPayload({});
        return;
      }

      if (edgeFunctionResult.data?.data_needed) {
        setPendingDataRequest(edgeFunctionResult.data.data_needed);
        setCurrentIntent(intent);
        setCurrentQuestion(question);
        setCurrentPayload(edgeFunctionResult.data.data_needed.intent_context.current_payload || {});
        
        // Update lastUserQueryPayload to reflect accumulated data for potential retry
        setLastUserQueryPayload(edgeFunctionResult.data.data_needed.intent_context.current_payload || {});

        const dataNeededMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: edgeFunctionResult.data.data_needed.prompt,
          timestamp: new Date().toISOString(),
          dataNeeded: edgeFunctionResult.data.data_needed,
          quickReplies: ['Cancel'],
          originalQuestion: question,
          collectedPayload: edgeFunctionResult.data.data_needed.intent_context.current_payload || {}, 
        };
        setMessages((prev) => [...prev, dataNeededMessage]);
        return;
      }

      const aiResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I've analyzed your financial data. Here is my recommendation:",
        timestamp: new Date().toISOString(),
        cards: [<DecisionCard key="decision-card" data={edgeFunctionResult.data} />],
        quickReplies: ['Thanks!', 'What else can you do?'],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setPendingDataRequest(null);
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
      // Clear last query states as the decision is complete
      setLastUserQueryText(null);
      setLastUserQueryIntent(null);
      setLastUserQueryPayload(null);

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
      setPendingDataRequest(null);
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = (valueToSend?: string | boolean) => {
    let finalMessageInput = messageInput;
    if (valueToSend !== undefined) {
      finalMessageInput = String(valueToSend);
    }

    if (finalMessageInput.trim() === '') return;

    const lowerCaseInput = finalMessageInput.toLowerCase(); // Define lowerCaseInput here

    // Handle "Thank you" / "Thanks!"
    if (['thank you', 'thanks', 'thank you!', 'thanks!'].includes(lowerCaseInput)) {
        const userThankYou: ChatMessage = {
            id: String(Date.now()),
            sender: 'user',
            text: finalMessageInput,
            timestamp: new Date().toISOString(),
        };
        const aiReply: ChatMessage = {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: "You're most welcome! I'm here to help your business thrive. Is there anything else I can assist you with?",
            timestamp: new Date().toISOString(),
            quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data', 'What else can you do?'],
        };
        setMessages((prev) => [...prev, userThankYou, aiReply]);
        setMessageInput('');
        return;
    }

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: finalMessageInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (pendingDataRequest && currentIntent && currentQuestion) {
      let parsedValue: number | boolean | string | undefined;
      
      if (pendingDataRequest.type === 'boolean') {
        parsedValue = lowerCaseInput === 'true' || lowerCaseInput === 'yes';
      } else if (pendingDataRequest.type === 'number') {
        const valueMatch = String(finalMessageInput).match(/(\d[\d,\.]*)/);
        if (valueMatch && valueMatch[1]) {
          parsedValue = parseFloat(valueMatch[1].replace(/,/g, ''));
          if (isNaN(parsedValue) || (parsedValue < 0 && pendingDataRequest.canBeZeroOrNone === false)) {
            parsedValue = undefined;
          }
        }
      } else if (pendingDataRequest.type === 'text_enum') {
        const selectedOption = pendingDataRequest.options?.find(option => 
          option.toLowerCase().includes(lowerCaseInput)
        );
        if (selectedOption) {
          parsedValue = selectedOption;
        } else {
          const retryMessage: ChatMessage = {
            id: String(Date.now()),
            sender: 'ai',
            text: `I couldn't understand your choice. Please select one of the following options: ${pendingDataRequest.options?.join(', ')}.`,
            timestamp: new Date().toISOString(),
            quickReplies: ['Cancel'],
          };
          setMessages((prev) => [...prev, retryMessage]);
          setIsAiTyping(false);
          setMessageInput('');
          return;
        }
      }

      if (parsedValue === undefined) {
        const retryMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `I couldn't understand the value. Please provide a valid input for ${pendingDataRequest.field.replace(/_/g, ' ')} (e.g., '50000', 'Yes/No', or select from options).`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Cancel'],
        };
        setMessages((prev) => [...prev, retryMessage]);
        setIsAiTyping(false);
        setMessageInput('');
        return;
      }

      if (pendingDataRequest.type === 'number' && pendingDataRequest.canBeZeroOrNone === false && parsedValue === 0) {
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

      const updatedPayload = { ...currentPayload, [pendingDataRequest.field]: parsedValue };
      setCurrentPayload(updatedPayload);
      sendToDecisionEngine(currentIntent, currentQuestion, updatedPayload);
      setMessageInput('');
      return;
    }

    let intentDetected: string | null = null;
    let initialPayload: Record<string, any> = {};

    if (lowerCaseInput.includes('hire') || lowerCaseInput.includes('staff') || lowerCaseInput.includes('employee')) {
      intentDetected = 'hiring';
    } else if (lowerCaseInput.includes('inventory') || lowerCaseInput.includes('stock') || lowerCaseInput.includes('restock') || lowerCaseInput.includes('buy more')) {
      intentDetected = 'inventory';
      const discountMatch = lowerCaseInput.match(/(\d+(\.\d+)?)% discount/);
      if (discountMatch && discountMatch[1]) {
        const discount = parseFloat(discountMatch[1]);
        if (!isNaN(discount) && discount >= 0 && discount <= 100) {
          initialPayload.supplier_discount_percentage = discount;
        }
      }
    } else if (lowerCaseInput.includes('marketing') || lowerCaseInput.includes('promote') || lowerCaseInput.includes('campaign') || lowerCaseInput.includes('advertise')) {
      intentDetected = 'marketing';
    } else if (lowerCaseInput.includes('savings') || lowerCaseInput.includes('save') || lowerCaseInput.includes('emergency fund') || lowerCaseInput.includes('growth fund') || lowerCaseInput.includes('allocate')) {
      intentDetected = 'savings';
    } else if (lowerCaseInput.includes('equipment') || lowerCaseInput.includes('asset') || lowerCaseInput.includes('machine') || lowerCaseInput.includes('tool')) {
      intentDetected = 'equipment';
    } else if (lowerCaseInput.includes('loan') || lowerCaseInput.includes('debt') || lowerCaseInput.includes('borrow') || lowerCaseInput.includes('credit')) {
      intentDetected = 'loan_management';
    } else if (lowerCaseInput.includes('expand') || lowerCaseInput.includes('expansion') || lowerCaseInput.includes('grow business') || lowerCaseInput.includes('new location') || lowerCaseInput.includes('new product line')) {
      intentDetected = 'business_expansion';
    }

    if (intentDetected) {
      setCurrentIntent(intentDetected);
      setCurrentQuestion(finalMessageInput);
      setCurrentPayload(initialPayload);

      // Store this as the last successful query that initiated a flow
      setLastUserQueryText(finalMessageInput);
      setLastUserQueryIntent(intentDetected);
      setLastUserQueryPayload(initialPayload);

      sendToDecisionEngine(intentDetected, finalMessageInput, initialPayload);
    } else {
      const noIntentResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I'm currently specialized in hiring, inventory, marketing, savings, equipment, loan, and business expansion decisions. Please ask me a question like 'Can I afford to hire a new staff member?', 'Should I restock my shop?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', or 'Should I expand my business?'.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, noIntentResponse]);
      setIsAiTyping(false);
    }
    setMessageInput('');
  };

  const handleQuickReply = (reply: string) => {
    const lowerCaseReply = reply.toLowerCase();

    // For special actions, explicitly add the user message and then perform the action
    if (lowerCaseReply === 'add new data') {
      setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }]);
      setIsAddDataModalOpen(true);
    } else if (lowerCaseReply === 'cancel' && pendingDataRequest) {
      setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }]);
      setPendingDataRequest(null);
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
      const cancelMessage: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "Okay, I've cancelled the current data request. How else can I help?",
        timestamp: new Date().toISOString(),
        quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data', 'What else can you do?'],
      };
      setMessages((prev) => [...prev, cancelMessage]);
    } else if (lowerCaseReply === 'try again') {
        setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }]);
        if (lastUserQueryIntent && lastUserQueryText) {
            setPendingDataRequest(null); // Clear any pending request before retrying
            setCurrentIntent(lastUserQueryIntent);
            setCurrentQuestion(lastUserQueryText);
            setCurrentPayload(lastUserQueryPayload || {}); // Use the last accumulated payload
            sendToDecisionEngine(lastUserQueryIntent, lastUserQueryText, lastUserQueryPayload || {});
        } else {
            const noRetryMessage: ChatMessage = {
                id: String(Date.now()),
                sender: 'ai',
                text: "I don't have a previous query to retry. Please ask me a new question.",
                timestamp: new Date().toISOString(),
                quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data', 'What else can you do?'],
            };
            setMessages((prev) => [...prev, noRetryMessage]);
        }
    } else if (lowerCaseReply === 'what else can you do?') {
        // This case is fine as the second setMessages overwrites the first, effectively resetting the chat.
        setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }]);
        setMessages([initialGreeting(userDisplayName || 'User')]);
        setPendingDataRequest(null);
        setCurrentIntent(null);
        setCurrentQuestion(null);
        setCurrentPayload({});
        setLastUserQueryText(null);
        setLastUserQueryIntent(null);
        setLastUserQueryPayload(null);
    } else {
        // For other quick replies, set the input field and then call handleSendMessage.
        // handleSendMessage will be responsible for adding the user's message to the state.
        setMessageInput(reply); 
        setTimeout(() => handleSendMessage(reply), 0); 
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  const getPlaceholderText = () => {
    if (pendingDataRequest) {
      let placeholder = pendingDataRequest.prompt;
      if (pendingDataRequest.type === 'number') {
        // Add currency hint if it's a number input and not already in prompt
        if (!placeholder.includes('(₦)')) {
          placeholder += ' (in ₦)';
        }
      } else if (pendingDataRequest.type === 'boolean') {
        placeholder += ' (Yes/No)';
      }
      return placeholder;
    }
    return "Ask about hiring, inventory, marketing, savings, equipment, loans, or business expansion...";
  };

  return (
    <>
      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0 mr-2 mt-1">
                  <img src={kudiGuardIcon} alt="KudiGuard AI" className="h-7 w-7 rounded-full" />
                </div>
              )}
              <Card
                className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-subtle text-foreground border' // Applied gradient here
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
              </Card>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="flex-shrink-0 mr-2 mt-1">
                <img src={kudiGuardIcon} alt="KudiGuard AI" className="h-7 w-7 rounded-full" />
              </div>
              <Card className="max-w-[70%] p-3 rounded-lg bg-gradient-subtle text-foreground border"> {/* Applied gradient here */}
                <TypingIndicator />
              </Card>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-card border-t border-border p-4 flex items-center flex-shrink-0">
          {pendingDataRequest?.type === 'boolean' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground mr-4">{getPlaceholderText()}</span>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSendMessage(true)} 
                  disabled={isAiTyping}
                  className="bg-gradient-primary"
                >
                  Yes
                </Button>
                <Button 
                  onClick={() => handleSendMessage(false)} 
                  disabled={isAiTyping}
                  variant="outline"
                >
                  No
                </Button>
              </div>
            </div>
          ) : pendingDataRequest?.type === 'text_enum' && pendingDataRequest.options ? (
            <div className="flex items-center w-full">
              <Select onValueChange={(value) => setMessageInput(value)} value={messageInput} disabled={isAiTyping}>
                <SelectTrigger className="flex-1 mr-2 h-12">
                  <SelectValue placeholder={getPlaceholderText()} />
                </SelectTrigger>
                <SelectContent>
                  {pendingDataRequest.options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleSendMessage()} className="bg-gradient-primary h-12 ml-2" disabled={isAiTyping || messageInput.trim() === ''}>
                <Send className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Textarea // Changed from Input to Textarea
              placeholder={getPlaceholderText()}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for new line
                  e.preventDefault(); // Prevent default behavior (new line)
                  handleSendMessage();
                }
              }}
              className="flex-1 mr-2 h-12 min-h-[48px] max-h-[150px] resize-none" // Changed resize-y to resize-none
              disabled={isAiTyping}
            />
          )}
          {!(pendingDataRequest?.type === 'boolean' || (pendingDataRequest?.type === 'text_enum' && pendingDataRequest.options)) && (
            <Button onClick={() => handleSendMessage()} className="bg-gradient-primary h-12 ml-2" disabled={isAiTyping || messageInput.trim() === ''}>
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <AddDataModal isOpen={isAddDataModalOpen} onClose={() => setIsAddDataModalOpen(false)} />
    </>
  );
};

export default ChatPage;