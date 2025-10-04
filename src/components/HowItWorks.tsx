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
        {/* Central Vertical DOTTED Line (Desktop only) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 border-l border-dotted border-border hidden md:block"></div>

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
                {/* Content Block (Unified for Mobile and Desktop) */}
                <div className={`
                  flex items-start space-x-4 text-left w-full p-4
                  md:w-[calc(50%-1.5rem)] // Half width minus spacing for desktop (24px)
                  ${isEven ? 'md:order-1 md:text-right md:ml-auto md:pr-6' : 'md:order-2 md:text-left md:mr-auto md:pl-6'} // Order and padding for alternating (24px)
                  relative // For positioning the connector
                `}>
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

                  {/* Desktop Connector (Horizontal line + small circle) */}
                  <div className={`
                    hidden md:flex absolute top-1/2 transform -translate-y-1/2 z-10
                    ${isEven ? 'left-full' : 'right-full'} // Position at the edge of the content block
                    flex items-center
                  `}>
                    <div className={`h-0.5 w-6 bg-primary ${isEven ? 'order-2' : 'order-1'}`}></div> {/* Horizontal line (24px) */}
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-background z-20"></div> {/* Small circle */}
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