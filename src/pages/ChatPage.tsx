import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
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
import { ParsedIntent } from '@/types/supabase-edge-functions';
import { useParams } from 'react-router-dom'; // Import useParams
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  cards?: React.ReactNode[];
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
  quickReplies?: string[];
}

interface ChatState {
  messages: ChatMessage[];
  pending_data_request: ChatMessage['dataNeeded'] | null;
  current_intent: string | null;
  current_question: string | null;
  current_payload: Record<string, any>;
  last_user_query_text: string | null;
  last_user_query_intent: string | null;
  last_user_query_payload: Record<string, any> | null;
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
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAddDataModalOpen, setIsAddDataModalOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const { chatId } = useParams<{ chatId: string }>(); // Get chatId from URL parameters
  const queryClient = useQueryClient();

  const initialGreeting = (name: string): ChatMessage => ({
    id: String(Date.now()),
    sender: 'ai',
    text: `Hello ${name}! I'm KudiGuard, your AI financial analyst. How can I help your business today?`,
    timestamp: new Date().toISOString(),
  });

  const { data: chatData, isLoading: chatLoading, error: chatError } = useQuery({
    queryKey: ['chatState', session?.user?.id, chatId], // Use chatId from useParams
    queryFn: async () => {
      if (!session?.user?.id || !chatId) return null; // Ensure chatId is present

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (!data) {
        // If chat ID is in URL but no data, it means an invalid chat ID or new chat not yet initialized
        // This case should ideally be handled by AuthenticatedLayout redirecting to a valid chat.
        // For robustness, we return a default state.
        return {
          messages: [initialGreeting(userDisplayName || 'there')],
          pending_data_request: null,
          current_intent: null,
          current_question: null,
          current_payload: {},
          last_user_query_text: null,
          last_user_query_intent: null,
          last_user_query_payload: null,
        };
      }

      return {
        ...data,
        messages: data.messages || [],
        pending_data_request: data.pending_data_request || null,
        current_payload: data.current_payload || {},
        last_user_query_payload: data.last_user_query_payload || null,
      };
    },
    enabled: !!session?.user?.id && !!chatId && !!userDisplayName, // Enable query only if chatId is present
    initialData: {
      messages: [initialGreeting(userDisplayName || 'there')],
      pending_data_request: null,
      current_intent: null,
      current_question: null,
      current_payload: {},
      last_user_query_text: null,
      last_user_query_intent: null,
      last_user_query_payload: null,
    },
    refetchOnWindowFocus: false,
  });

  const updateChatMutation = useMutation({
    mutationFn: async (newChatState: Partial<ChatState>) => {
      if (!session?.user?.id || !chatId) { // Use chatId from useParams
        throw new Error("User not authenticated or no active chat ID.");
      }
      const { error } = await supabase
        .from('chats')
        .update({
          ...newChatState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId) // Use chatId from useParams
        .eq('user_id', session.user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatState', session?.user?.id, chatId] }); // Invalidate with chatId
      queryClient.invalidateQueries({ queryKey: ['chatHistory', session?.user?.id] }); // Invalidate chat history to update sidebar
    },
    onError: (error: any) => {
      console.error("Failed to save chat state:", error.message);
      toast({
        title: "Chat Save Error",
        description: "Could not save chat progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const {
    messages,
    pending_data_request: pendingDataRequest,
    current_intent: currentIntent,
    current_question: currentQuestion,
    current_payload: currentPayload,
    last_user_query_text: lastUserQueryText,
    last_user_query_intent: lastUserQueryIntent,
    last_user_query_payload: lastUserQueryPayload,
  } = chatData || {};

  const updateChatState = (updates: Partial<ChatState>) => {
    const newMessages = updates.messages || messages;
    const newPendingDataRequest = updates.pending_data_request !== undefined ? updates.pending_data_request : pendingDataRequest;
    const newCurrentIntent = updates.current_intent !== undefined ? updates.current_intent : currentIntent;
    const newCurrentQuestion = updates.current_question !== undefined ? updates.current_question : currentQuestion;
    const newCurrentPayload = updates.current_payload !== undefined ? updates.current_payload : currentPayload;
    const newLastUserQueryText = updates.last_user_query_text !== undefined ? updates.last_user_query_text : lastUserQueryText;
    const newLastUserQueryIntent = updates.last_user_query_intent !== undefined ? updates.last_user_query_intent : lastUserQueryIntent;
    const newLastUserQueryPayload = updates.last_user_query_payload !== undefined ? updates.last_user_query_payload : lastUserQueryPayload;

    updateChatMutation.mutate({
      messages: newMessages,
      pending_data_request: newPendingDataRequest,
      current_intent: newCurrentIntent,
      current_question: newCurrentQuestion,
      current_payload: newCurrentPayload,
      last_user_query_text: newLastUserQueryText,
      last_user_query_intent: newLastUserQueryIntent,
      last_user_query_payload: newLastUserQueryPayload,
    });
  };

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
        if (edgeFunctionResult?.error?.code === 'DECISION_NOT_FOUND') {
          errorMessage = "I can't provide a recommendation without your financial data. Please add your monthly revenue, expenses, and savings first.";
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
        };
        updateChatState({
          messages: [...(messages || []), errorResponse],
          pending_data_request: null,
          current_intent: null,
          current_question: null,
          current_payload: {},
        });
        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (edgeFunctionResult.data?.data_needed) {
        const dataNeeded = edgeFunctionResult.data.data_needed;
        const dataNeededMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: dataNeeded.prompt,
          timestamp: new Date().toISOString(),
          dataNeeded: dataNeeded,
          originalQuestion: question,
          collectedPayload: dataNeeded.intent_context.current_payload || {}, 
        };
        updateChatState({
          messages: [...(messages || []), dataNeededMessage],
          pending_data_request: dataNeeded,
          current_intent: intent,
          current_question: question,
          current_payload: dataNeeded.intent_context.current_payload || {},
          last_user_query_payload: dataNeeded.intent_context.current_payload || {},
        });
        return;
      }

      const aiResponse: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "I've analyzed your financial data. Here is my recommendation:",
        timestamp: new Date().toISOString(),
        cards: [<DecisionCard key="decision-card" data={edgeFunctionResult.data} />],
      };
      updateChatState({
        messages: [...(messages || []), aiResponse],
        pending_data_request: null,
        current_intent: null,
        current_question: null,
        current_payload: {},
        last_user_query_text: null,
        last_user_query_intent: null,
        last_user_query_payload: null,
      });

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
      };
      updateChatState({
        messages: [...(messages || []), errorResponse],
        pending_data_request: null,
        current_intent: null,
        current_question: null,
        current_payload: {},
      });
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = async (valueToSend?: string | boolean) => {
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
        };
        updateChatState({ messages: [...(messages || []), userThankYou, aiReply] });
        setMessageInput('');
        return;
    }

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: finalMessageInput,
      timestamp: new Date().toISOString(),
    };
    updateChatState({ messages: [...(messages || []), userMessage] });
    setMessageInput('');

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
        const selectedOption = pendingDataRequest.options?.find((option: string) =>
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
          };
          updateChatState({ messages: [...(messages || []), retryMessage] });
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
        };
        updateChatState({ messages: [...(messages || []), retryMessage] });
        setIsAiTyping(false);
        return;
      }

      if (pendingDataRequest.type === 'number' && pendingDataRequest.canBeZeroOrNone === false && parsedValue === 0) {
        const retryMessage: ChatMessage = {
          id: String(Date.now()),
          sender: 'ai',
          text: `The value for ${pendingDataRequest.field.replace(/_/g, ' ')} must be greater than 0. Please provide a valid input.`,
          timestamp: new Date().toISOString(),
        };
        updateChatState({ messages: [...(messages || []), retryMessage] });
        setIsAiTyping(false);
        return;
      }

      const updatedPayload = { ...currentPayload, [pendingDataRequest.field]: parsedValue };
      updateChatState({ current_payload: updatedPayload });
      sendToDecisionEngine(currentIntent, currentQuestion, updatedPayload);
      return;
    }

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
        };
        updateChatState({ messages: [...(messages || []), errorResponse] });
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
        };
        updateChatState({ messages: [...(messages || []), noIntentResponse] });
        setIsAiTyping(false);
        return;
      }

      updateChatState({
        current_intent: parsedIntent.intent,
        current_question: parsedIntent.question,
        current_payload: parsedIntent.payload || {},
        last_user_query_text: parsedIntent.question,
        last_user_query_intent: parsedIntent.intent,
        last_user_query_payload: parsedIntent.payload || {},
      });

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
      };
      updateChatState({ messages: [...(messages || []), errorResponse] });
      setIsAiTyping(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    const lowerCaseReply = reply.toLowerCase();

    if (lowerCaseReply === 'add new data') {
      updateChatState({ messages: [...(messages || []), { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }] });
      setIsAddDataModalOpen(true);
    } else if (lowerCaseReply === 'cancel' && pendingDataRequest) {
      updateChatState({
        messages: [...(messages || []), { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }],
        pending_data_request: null,
        current_intent: null,
        current_question: null,
        current_payload: {},
      });
      const cancelMessage: ChatMessage = {
        id: String(Date.now()),
        sender: 'ai',
        text: "Okay, I've cancelled the current data request. How else can I help?",
        timestamp: new Date().toISOString(),
      };
      updateChatState({ messages: [...(messages || []), cancelMessage] });
    } else if (lowerCaseReply === 'try again') {
        updateChatState({ messages: [...(messages || []), { id: String(Date.now()), sender: 'user', text: reply, timestamp: new Date().toISOString() }] });
        if (lastUserQueryIntent && lastUserQueryText) {
            updateChatState({
                pending_data_request: null,
                current_intent: lastUserQueryIntent,
                current_question: lastUserQueryText,
                current_payload: lastUserQueryPayload || {},
            });
            sendToDecisionEngine(lastUserQueryIntent, lastUserQueryText, lastUserQueryPayload || {});
        } else {
            const noRetryMessage: ChatMessage = {
                id: String(Date.now()),
                sender: 'ai',
                text: "I don't have a previous query to retry. Please ask me a new question.",
                timestamp: new Date().toISOString(),
            };
            updateChatState({ messages: [...(messages || []), noRetryMessage] });
        }
    } else {
        setMessageInput(reply); 
        setTimeout(() => handleSendMessage(reply), 0); 
    }
  };

  if (sessionLoading || chatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (chatError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-destructive">
        <p>Error loading chat: {chatError.message}</p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(messages || []).map((msg: ChatMessage) => (
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
                    {msg.quickReplies.map((reply: string, index: number) => (
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
                  {pendingDataRequest.options.map((option: string) => (
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