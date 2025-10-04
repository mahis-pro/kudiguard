import React from 'react';
import { MessageCircle, Calculator, CheckCircle, History } from 'lucide-react';
import { useAnimateOnScroll } from '@/hooks/use-animate-on-scroll';

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
      
      <div className="relative max-w-3xl mx-auto">
        {/* Vertical line for timeline */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border hidden md:block"></div>

        <div className="space-y-12">
          {steps.map((step, index) => {
            const { ref, isVisible } = useAnimateOnScroll({ delay: index * 150 }); // Staggered delay
            const isEven = index % 2 === 0;

            return (
              <div 
                key={index} 
                ref={ref}
                className={`
                  flex items-center md:items-start relative 
                  ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} 
                  ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Timeline Circle (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 z-10 bg-background border-2 border-primary rounded-full p-2">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>

                {/* Content Block */}
                <div className={`
                  w-full md:w-1/2 p-4 md:p-0 
                  ${isEven ? 'md:pr-12 text-center md:text-right' : 'md:pl-12 text-center md:text-left'}
                `}>
                  <div className="md:hidden bg-gradient-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;