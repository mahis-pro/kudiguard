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
        {/* Central Vertical Line - Hidden on mobile, block on desktop */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border hidden md:block"></div>

        <div className="space-y-12">
          {steps.map((step, index) => {
            const { ref, isVisible } = useAnimateOnScroll({ delay: index * 150 }); // Staggered delay
            const isEven = index % 2 === 0; // Used for alternating left/right on desktop

            return (
              <div 
                key={index} 
                ref={ref}
                className={`
                  relative flex items-center
                  ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Timeline Circle (Desktop only) */}
                <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 z-10 bg-background border-2 border-primary rounded-full p-2">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>

                {/* Content Block */}
                <div className="w-full p-4 md:p-0">
                  {/* Mobile Layout: Icon on left, text left-aligned */}
                  <div className="flex items-start space-x-4 text-left md:hidden">
                    <div className="bg-background border-2 border-primary rounded-full p-2 flex items-center justify-center flex-shrink-0">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-primary mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Desktop Layout: Alternating left/right, text aligned to center line */}
                  <div className={`
                    hidden md:block md:w-1/2 
                    ${isEven ? 'md:pr-12 md:text-right md:ml-auto' : 'md:pl-12 md:text-left md:mr-auto'}
                  `}>
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
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