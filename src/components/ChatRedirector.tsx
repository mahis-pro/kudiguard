import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ChatRedirector = () => {
  const { session, supabase, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams<{ chatId: string }>();

  // Function to handle starting a new chat
  const handleStartNewChat = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a new chat.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          messages: [],
          current_payload: {},
          title: 'New Chat', // Default title for a new chat
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['chatState', session.user.id] });
      queryClient.invalidateQueries({ queryKey: ['chatHistory', session.user.id] });
      navigate(`/chat/${data.id}`);
      toast({
        title: "New Chat Started",
        description: "Your conversation history has been cleared and a new chat begun.",
        variant: "default",
      });
      return data.id; // Return the new chat ID
    } catch (error: any) {
      console.error('Error starting new chat:', error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to start a new chat.",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    if (!sessionLoading && session?.user) {
      const fetchOrRedirectChat = async () => {
        if (urlChatId) {
          // If a chatId is in the URL, ensure it's a valid chat for the user
          const { data, error } = await supabase
            .from('chats')
            .select('id')
            .eq('id', urlChatId)
            .eq('user_id', session.user.id)
            .single();

          if (error || !data) {
            console.error('Error fetching chat from URL or chat not found:', error?.message);
            toast({
              title: "Chat Not Found",
              description: "The requested chat could not be loaded. Starting a new one.",
              variant: "destructive",
            });
            await handleStartNewChat(); // Create a new chat if URL chat is invalid
          }
          // If data exists, no need to navigate, ChatPage will pick it up
        } else {
          // No chatId in URL, try to load the latest chat or create a new one
          const { data, error } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false }) // Order by updated_at for latest activity
            .limit(1)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching latest chat:', error.message);
            toast({
              title: "Error loading chat",
              description: "Could not load your previous chat. Starting a new one.",
              variant: "destructive",
            });
            await handleStartNewChat();
          } else if (data) {
            navigate(`/chat/${data.id}`); // Navigate to the latest chat
          } else {
            await handleStartNewChat(); // No existing chats, create a new one
          }
        }
      };
      fetchOrRedirectChat();
    }
  }, [sessionLoading, session, supabase, toast, navigate, urlChatId]);

  // This component doesn't render anything directly, it just handles redirection
  return null;
};

export default ChatRedirector;