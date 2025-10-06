import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquarePlus } from 'lucide-react'; // Added MessageSquarePlus import
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/auth/SessionContextProvider';
import AddDataModal from '@/components/AddDataModal';
import DecisionCard from '@/components/DecisionCard';
import { useToast } from '@/hooks/use-toast';
import kudiGuardIcon from '/kudiguard-icon.jpg';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedIntent } from '@/types/supabase-edge-functions'; // Import new types

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
    type: 'number' | 'boolean' | 'text_enum';
    options?: string[];
    intent_context: { intent: string; decision_type: string; current_payload?: Record<string, any>; };
    canBeZeroOrNone?: boolean;
  };
  originalQuestion?: string; 
  collectedPayload?: Record<string, any>;
}

// Define the structure of the chat state to be saved
interface PersistedChatState {
  messages: ChatMessage[];
  pendingDataRequest: ChatMessage['dataNeeded'] | null;
  currentIntent: string | null;
  currentQuestion: string | null;
  currentPayload: Record<string, any>;
  lastUserQueryText: string | null;
  lastUserQueryIntent: string | null;
  lastUserQueryPayload: Record<string, any> | null;
}

const TypingIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
);

const ChatPage = () => {
  const { userDisplayName, isLoading: sessionLoading, supabase, session } = useSession();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);
  const [pendingDataRequest, setPendingDataRequest] = useState<ChatMessage['dataNeeded'] | null>(null);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<Record<string, any>>({});

  const [lastUserQueryText, setLastUserQueryText] = useState<string | null>(null);
  const [lastUserQueryIntent, setLastUserQueryIntent] = useState<string | null>(null);
  const [lastUserQueryPayload, setLastUserQueryPayload] = useState<Record<string, any> | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper to get the localStorage key based on user ID
  const getLocalStorageKey = (userId: string | undefined) => 
    userId ? `kudiguard_chat_state_${userId}` : 'kudiguard_chat_state_anonymous';

  // Initial greeting message
  const initialGreeting = (name: string): ChatMessage => ({
    id: '1',
    sender: 'ai',
    text: `Hello ${name}! I'm KudiGuard, your AI financial analyst. How can I help your business today?`,
    timestamp: new Date().toISOString(),
    quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data'],
  });

  // Function to start a new chat
  const handleStartNewChat = () => {
    const userId = session?.user?.id;
    const key = getLocalStorageKey(userId);
    localStorage.removeItem(key); // Clear from local storage

    setMessages([initialGreeting(userDisplayName || 'User')]);
    setPendingDataRequest(null);
    setCurrentIntent(null);
    setCurrentQuestion(null);
    setCurrentPayload({});
    setLastUserQueryText(null);
    setLastUserQueryIntent(null);
    setLastUserQueryPayload(null);
    toast({
      title: "New Chat Started",
      description: "Your conversation history has been cleared.",
      variant: "default",
    });
  };

  // Effect to load chat state from localStorage on mount
  useEffect(() => {
    if (!sessionLoading && userDisplayName) {
      const userId = session?.user?.id;
      const key = getLocalStorageKey(userId);
      const savedState = localStorage.getItem(key);

      if (savedState) {
        try {
          const parsedState: PersistedChatState = JSON.parse(savedState);
          setMessages(parsedState.messages);
          setPendingDataRequest(parsedState.pendingDataRequest);
          setCurrentIntent(parsedState.currentIntent);
          setCurrentQuestion(parsedState.currentQuestion);
          setCurrentPayload(parsedState.currentPayload);
          setLastUserQueryText(parsedState.lastUserQueryText);
          setLastUserQueryIntent(parsedState.lastUserQueryIntent);
          setLastUserQueryPayload(parsedState.lastUserQueryPayload);
        } catch (e) {
          console.error("Failed to parse saved chat state from localStorage:", e);
          setMessages([initialGreeting(userDisplayName)]);
        }
      } else {
        setMessages([initialGreeting(userDisplayName)]);
      }
    }
  }, [sessionLoading, userDisplayName, session?.user?.id]); // Re-run if user changes

  // Effect to save chat state to localStorage whenever relevant state changes
  useEffect(() => {
    if (!sessionLoading && userDisplayName) {
      const userId = session?.user?.id;
      const key = getLocalStorageKey(userId);
      const stateToSave: PersistedChatState = {
        messages,
        pendingDataRequest,
        currentIntent,
        currentQuestion,
        currentPayload,
        lastUserQueryText,
        lastUserQueryIntent,
        lastUserQueryPayload,
      };
      localStorage.setItem(key, JSON.stringify(stateToSave));
    }
  }, [
    messages,
    pendingDataRequest,
    currentIntent,
    currentQuestion,
    currentPayload,
    lastUserQueryText,
    lastUserQueryIntent,
    lastUserQueryPayload,
    sessionLoading,
    userDisplayName,
    session?.user?.id,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

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
        quickReplies: ['Thanks!'],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setPendingDataRequest(null);
      setCurrentIntent(null);
      setCurrentQuestion(null);
      setCurrentPayload({});
      setLastUserQueryText(null);
      setLastUserQueryIntent(null);
      setLastUserQueryPayload(null);

    } catch (error: any) {
      console.error("Error invoking decision-engine edge function:", error);
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

  const handleSendMessage = async (valueToSend?: string | boolean) => { // Made async
    let finalMessageInput = messageInput;
    if (valueToSend !== undefined) {
      finalMessageInput = String(valueToSend);
    }

    if (finalMessageInput.trim() === '') return;

    const lowerCaseInput = finalMessageInput.toLowerCase();

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
            quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data'],
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
    setMessageInput(''); // Clear input immediately after sending

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
        return;
      }

      const updatedPayload = { ...currentPayload, [pendingDataRequest.field]: parsedValue };
      setCurrentPayload(updatedPayload);
      sendToDecisionEngine(currentIntent, currentQuestion, updatedPayload);
      return;
    }

    // --- New Intent Parsing Logic ---
    setIsAiTyping(true);
    try {
      const { data: intentParserResult, error: invokeError } = await supabase.functions.invoke('intent-parser', {
        body: { user_query: finalMessageInput },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!intentParserResult || !intentParserResult.success || !intentParserResult.data) {
        const errorMessage = intentParserResult?.error?.details || "I couldn't understand your request. Please try rephrasing.";
        const errorResponse: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          quickReplies: [], // No quick replies for unknown intent
        };
        setMessages((prev) => [...prev, errorResponse]);
        setIsAiTyping(false);
        return;
      }

      const parsedIntent: ParsedIntent = intentParserResult.data;
      console.log("Parsed Intent:", parsedIntent);

      if (parsedIntent.intent === 'unknown') {
        const noIntentResponse: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: "I'm currently specialized in hiring, inventory, marketing, savings, equipment, loan, and business expansion decisions. Please ask me a question related to these topics.",
          timestamp: new Date().toISOString(),
          quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data'],
        };
        setMessages((prev) => [...prev, noIntentResponse]);
        setIsAiTyping(false);
        return;
      }

      // If intent is detected, proceed to decision engine
      setCurrentIntent(parsedIntent.intent);
      setCurrentQuestion(parsedIntent.question);
      setCurrentPayload(parsedIntent.payload || {});

      setLastUserQueryText(parsedIntent.question);
      setLastUserQueryIntent(parsedIntent.intent);
      setLastUserQueryPayload(parsedIntent.payload || {});

      sendToDecisionEngine(parsedIntent.intent, parsedIntent.question, parsedIntent.payload);

    } catch (error: any) {
      console.error("Error invoking intent-parser edge function:", error);
      let errorMessage = "An unexpected error occurred while processing your query.";
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
        quickReplies: [], // No quick replies for unknown intent
      };
      setMessages((prev) => [...prev, errorResponse]);
      setIsAiTyping(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    const lowerCaseReply = reply.toLowerCase();

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
        quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data'],
      };
      setMessages((prev) => [...prev, cancelMessage]);
    } else if (lowerCaseReply === 'try again') {
        setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }]);
        if (lastUserQueryIntent && lastUserQueryText) {
            setPendingDataRequest(null);
            setCurrentIntent(lastUserQueryIntent);
            setCurrentQuestion(lastUserQueryText);
            setCurrentPayload(lastUserQueryPayload || {});
            sendToDecisionEngine(lastUserQueryIntent, lastUserQueryText, lastUserQueryPayload || {});
        } else {
            const noRetryMessage: ChatMessage = {
                id: String(Date.now()),
                sender: 'ai',
                text: "I don't have a previous query to retry. Please ask me a new question.",
                timestamp: new Date().toISOString(),
                quickReplies: ['Should I hire someone?', 'Should I restock?', 'Should I invest in marketing?', 'How can I improve my savings?', 'Should I buy new equipment?', 'Should I take a loan?', 'Should I expand my business?', 'Add new data'],
            };
            setMessages((prev) => [...prev, noRetryMessage]);
        }
    } else {
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
        <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-primary">KudiGuard Chat</h2>
          <Button
            variant="outline"
            onClick={handleStartNewChat}
            className="flex items-center"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Start New Chat
          </Button>
        </div>
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
                    : 'bg-gradient-subtle text-foreground border'
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
              <Card className="max-w-[70%] p-3 rounded-lg bg-gradient-subtle text-foreground border">
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
            <Textarea
              placeholder={getPlaceholderText()}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 mr-2 h-12 min-h-[48px] max-h-[150px] resize-none"
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