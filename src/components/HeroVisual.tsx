import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

const HeroVisual = () => {
  return (
    // Mockup container
    <div className="relative w-full max-w-md mx-auto p-4">
      <div className="bg-background shadow-2xl rounded-2xl overflow-hidden border-4 border-border animate-fade-in">
        {/* Mockup Header */}
        <div className="bg-muted/50 p-2 flex items-center border-b border-border">
          <div className="w-3 h-3 rounded-full bg-destructive/50 mr-1.5"></div>
          <div className="w-3 h-3 rounded-full bg-warning/50 mr-1.5"></div>
          <div className="w-3 h-3 rounded-full bg-success/50"></div>
        </div>
        
        {/* App Content */}
        <div className="p-4 space-y-3 bg-gradient-subtle">
          {/* User Question */}
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%] shadow-md">
              <p className="text-sm">Can I hire another staff member?</p>
            </div>
          </div>

          {/* KudiGuard Response */}
          <div className="flex justify-start items-start">
            <div className="bg-gradient-primary p-2 rounded-full mr-2 flex-shrink-0 shadow-md">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="bg-card text-foreground rounded-lg p-3 max-w-[80%] shadow-md border border-border">
              <p className="text-sm font-medium mb-1 text-primary">KudiGuard says:</p>
              <p className="text-sm">
                <span className="text-warning font-semibold">⚠️ Wait.</span> Your current net income is ₦30,000. Build a stronger financial foundation first.
              </p>
            </div>
          </div>

          {/* Call to Action within visual */}
          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Get personalized advice for your business.</p>
            <div className="flex justify-center mt-2">
              <a href="/login" className="inline-flex items-center text-primary hover:underline text-sm font-medium">
                Try KudiGuard Now <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroVisual;