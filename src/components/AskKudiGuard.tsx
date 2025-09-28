import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

interface AskKudiGuardProps {
  onBack: () => void;
  onShowDataInput: (question: string, intent: string) => void; // Updated to pass intent
}

const AskKudiGuard = ({ onBack, onShowDataInput }: AskKudiGuardProps) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestedQuestions = [
    "Can I hire another staff member?",
    "Should I buy more stock this month?", 
    "Is it safe to take a business loan?",
    "Can I afford to expand my shop?",
    "Should I increase my product prices?"
  ];

  // Simple intent detection based on keywords
  const determineIntent = (q: string): string => {
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('hire') || lowerQ.includes('staff')) return 'hire_staff';
    if (lowerQ.includes('stock') || lowerQ.includes('inventory') || lowerQ.includes('buy more')) return 'manage_inventory';
    if (lowerQ.includes('loan') || lowerQ.includes('borrow') || lowerQ.includes('finance')) return 'take_loan';
    if (lowerQ.includes('expand') || lowerQ.includes('shop') || lowerQ.includes('new location')) return 'expand_shop';
    if (lowerQ.includes('price') || lowerQ.includes('increase prices')) return 'adjust_pricing';
    return 'general_advice'; // Default intent
  };

  const handleSubmit = () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    const intent = determineIntent(question); // Determine intent
    // Simulate processing then show data input
    setTimeout(() => {
      setIsLoading(false);
      onShowDataInput(question, intent); // Pass intent
    }, 1000);
  };

  const handleSuggestedClick = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion);
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
          </CardContent>
        </Card>

        {/* Suggested Questions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Popular Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestedQuestions.map((suggestedQuestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleSuggestedClick(suggestedQuestion)}
                  className="w-full text-left justify-start h-auto py-3 px-4 hover:bg-accent"
                >
                  <MessageCircle className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{suggestedQuestion}</span>
                </Button>
              ))}
            </div>
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