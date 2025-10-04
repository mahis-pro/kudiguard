import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Calculator,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  MessageCircle
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import HeroVisual from '@/components/HeroVisual';
import HowItWorks from '@/components/HowItWorks';
import Navigation from '@/components/Navigation'; // Import Navigation for public pages


const Landing = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "Ask Any Financial Question",
      description: "Get instant, clear answers to your business financial dilemmas."
    },
    {
      icon: Calculator,
      title: "Personalized AI Analysis",
      description: "Our AI uses your data to provide tailored, actionable advice."
    },
    {
      icon: TrendingUp,
      title: "Sustainable Growth",
      description: "Make informed decisions that lead to long-term business success."
    },
    {
      icon: Users,
      title: "Built for Nigerian Vendors",
      description: "Advice specifically tailored to the unique market conditions in Nigeria."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <Navigation /> {/* Use the public Navigation component */}

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="pt-16"> {/* Added padding-top here */}
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
            {/* Text Content */}
            <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 animate-fade-in">
              Stop Guessing, Start Deciding
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in">
              With KudiGuard, you get clear answers to everyday questions when to restock, hire, or save so your money works smarter.
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-primary hover:shadow-success text-lg px-8 py-4">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Hero Visual */}
            <div className="w-full max-w-3xl mt-8 animate-fade-in">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Why KudiGuard is Your Best Partner
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Empowering your business with intelligent, localized financial guidance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card hover:shadow-success transition-all duration-300 hover-scale">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-primary py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join hundreds of Nigerian vendors who are already making smarter financial decisions with KudiGuard.
            </p>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img 
                src={kudiGuardLogo} 
                alt="KudiGuard" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-muted-foreground">
              Empowering Nigerian vendors with smart financial decisions
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;