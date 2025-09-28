import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, CheckCircle, ArrowRight } from 'lucide-react';

const HeroVisual = () => {
  return (
    <div className="relative w-full max-w-md mx-auto p-4">
      <Card className="shadow-card bg-white/30 backdrop-blur-md border border-white/10 animate-fade-in">
        <CardContent className="p-4 space-y-3">
          {/* User Question */}
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
              <p className="text-sm">Can I hire another staff member?</p>
            </div>
          </div>

          {/* KudiGuard Response */}
          <div className="flex justify-start items-start">
            <div className="bg-gradient-primary p-2 rounded-full mr-2 flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="bg-accent text-foreground rounded-lg p-3 max-w-[80%]">
              <p className="text-sm font-medium mb-1">KudiGuard says:</p>
              <p className="text-sm">
                <span className="text-warning font-semibold">⚠️ Wait.</span> Your current net income is ₦30,000. Build stronger financial foundation first.
              </p>
            </div>
          </div>

          {/* Call to Action within visual */}
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">Get personalized advice for your business.</p>
            <div className="flex justify-center mt-2">
              <a href="/login" className="inline-flex items-center text-primary hover:underline text-sm font-medium">
                Try KudiGuard Now <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroVisual;