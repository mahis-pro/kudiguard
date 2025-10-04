import React from 'react';
import { MessageCircle, Calculator, CheckCircle, History } from 'lucide-react';
import { useAnimateOnScroll } from '@/hooks/use-animate-on-scroll'; // Import the new hook

const HowItWorks = () => {
  const steps = [
    {
      icon: MessageCircle,
      title: "Ask Your Question",
      description: "Simply type your financial dilemma, like 'Should I expand my shop?'"
    },
    {
      icon: Calculator,
      title: "Provide Your Data",
      description: "Input key figures: monthly revenue, expenses, and savings."
    },
    {
      icon: CheckCircle,
      title: "Get Instant Advice",
      description: "Receive clear 'Do it' or 'Wait' recommendations with explanations."
    },
    {
      icon: History,
      title: "Track & Grow",
      description: "Save decisions to your history and monitor your business progress."
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-primary mb-4">
          How KudiGuard Works
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get smart financial advice in three simple steps.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {steps.map((step, index) => {
          const { ref, isVisible } = useAnimateOnScroll({ delay: index * 100 }); // Staggered delay
          return (
            <div 
              key={index} 
              ref={ref}
              className={`
                bg-background border border-border rounded-lg shadow-card p-6 text-center 
                hover:shadow-success transition-all duration-300 hover-scale
                ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
              `}
              style={{ animationDelay: `${index * 100}ms` }} // Apply delay for staggered effect
            >
              <div className="bg-gradient-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HowItWorks;