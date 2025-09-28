import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

interface AskKudiGuardProps {
  onBack: () => void;
  onShowDataInput: (question: string, intent: string) => void;
}

const AskKudiGuard = ({ onBack, onShowDataInput }: AskKudiGuardProps) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const suggestedQuestions = [
    "Can I hire another staff member?",
    "Should I buy more stock this month?", 
    "Is it safe to take a business loan?",
    "Can I afford to expand my shop?",
    "Should I increase my product prices?",
    "How much should I save for emergencies?",
    "Is it a good time to invest in new equipment?",
    "Can I afford to open a second branch?",
    "What's a healthy profit margin for my business?",
    "Should I reduce my operating expenses?",
    "How can I improve my cash flow?",
    "Is my current inventory level optimal?",
    "When should I consider a marketing campaign?",
    "Can I afford to give staff bonuses?",
    "Should I pay off my business debt early?",
    "How much can I safely withdraw from my business?",
    "What's the best way to manage my receivables?",
    "Should I diversify my product offerings?",
    "Is my business financially ready for a slow season?",
    "How can I track my daily sales more effectively?"
  ];

  useEffect(() => {
    if (question.trim() === '') {
      setFilteredSuggestions(suggestedQuestions);
    } else {
      setFilteredSuggestions(
        suggestedQuestions.filter(sugg =>
          sugg.toLowerCase().includes(question.toLowerCase())
        )
      );
    }
  }, [question]);

  // Simple intent detection based on keywords
  const determineIntent = (q: string): string => {
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('hire') || lowerQ.includes('staff') || lowerQ.includes('bonuses')) return 'hire_staff';
    if (lowerQ.includes('stock') || lowerQ.includes('inventory') || lowerQ.includes('buy more') || lowerQ.includes('optimal inventory')) return 'manage_inventory';
    if (lowerQ.includes('loan') || lowerQ.includes('borrow') || lowerQ.includes('finance') || lowerQ.includes('debt') || lowerQ.includes('pay off debt')) return 'take_loan';
    if (lowerQ.includes('expand') || lowerQ.includes('shop') || lowerQ.includes('new location') || lowerQ.includes('second branch')) return 'expand_shop';
    if (lowerQ.includes('price') || lowerQ.includes('increase prices') || lowerQ.includes('profit margin')) return 'adjust_pricing';
    if (lowerQ.includes('save') || lowerQ.includes('savings') || lowerQ.includes('emergency fund') || lowerQ.includes('slow season')) return 'manage_savings';
    if (lowerQ.includes('equipment') || lowerQ.includes('asset purchase')) return 'invest_equipment';
    if (lowerQ.includes('expenses') || lowerQ.includes('reduce expenses') || lowerQ.includes('cash flow')) return 'manage_expenses';
    if (lowerQ.includes('marketing')) return 'marketing_campaign';
    if (lowerQ.includes('withdraw') || lowerQ.includes('owner withdrawals')) return 'owner_withdrawals';
    if (lowerQ.includes('receivables')) return 'manage_receivables';
    if (lowerQ.includes('diversify product')) return 'diversify_products';
    if (lowerQ.includes('track sales')) return 'track_sales';
    return 'general_advice'; // Default intent
  };

  const handleSubmit = () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    const intent = determineIntent(question);
    setTimeout(() => {
      setIsLoading(false);
      onShowDataInput(question, intent);
    }, 1000);
  };

  const handleSuggestedClick = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion);
    handleSubmit(); // Automatically submit when a suggestion is clicked
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-3 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="bg-gradient-primary p-2 rounded-full mr-3">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Ask KudiGuard</h1>
              <p className="text-sm text-muted-foreground">Get personalized financial advice</p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What financial decision do you need help with?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="e.g., Can I hire another staff member?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1"
              />
              <Button 
                onClick={handleSubmit}
                disabled={!question.trim() || isLoading}
                className="bg-gradient-primary hover:shadow-success"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span>KudiGuard is thinking...</span>
              </div>
            )}

            {/* Dynamic Suggestions */}
            {!isLoading && filteredSuggestions.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
                {filteredSuggestions.map((suggestedQuestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    onClick={() => handleSuggestedClick(suggestedQuestion)}
                    className="w-full text-left justify-start h-auto py-3 px-4 hover:bg-accent"
                  >
                    <MessageCircle className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{suggestedQuestion}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="shadow-card mt-6 bg-success-light border-success/20">
          <CardContent className="p-4">
            <p className="text-sm text-success font-medium">
              💡 Tip: The more specific your question, the better advice KudiGuard can provide!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AskKudiGuard;