import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  Calculator,
  ArrowRight,
  Facebook, 
  Twitter,  
  Instagram,
  MessageCircle // Added MessageCircle import
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import HeroVisual from '@/components/HeroVisual';
import HowItWorks from '@/components/HowItWorks';
import Navigation from '@/components/Navigation';
import { useAnimateOnScroll } from '@/hooks/use-animate-on-scroll';


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
      <Navigation />

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 bg-hero-gradient">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
            {/* Text Content */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-primary-foreground mb-6 leading-tight animate-fade-in">
              Stop Guessing, Start Deciding
            </h1>
            
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto animate-fade-in">
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
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary text-primary hover:bg-primary/10">
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
          
          <div className="max-w-3xl mx-auto space-y-8">
            {features.map((feature, index) => {
              const { ref, isVisible } = useAnimateOnScroll({ delay: index * 150 });
              return (
                <div 
                  key={index} 
                  ref={ref}
                  className={`
                    flex items-start p-4 border-b border-border last:border-b-0 
                    ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
                  `}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="bg-gradient-primary w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
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
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4 hover:shadow-success">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
              {/* Column 1: Logo and Tagline */}
              <div className="space-y-4">
                <Link to="/" className="flex items-center justify-center md:justify-start">
                  <img src={kudiGuardLogo} alt="KudiGuard" className="h-10 w-auto" />
                </Link>
                <p className="text-sm text-muted-foreground">
                  Empowering Nigerian vendors with smart financial decisions.
                </p>
              </div>

              {/* Column 2: Company Links */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Company</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                  <li><Link to="/help" className="hover:text-primary transition-colors">Contact Us</Link></li>
                </ul>
              </div>

              {/* Column 3: Resources */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Resources</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link to="/tips" className="hover:text-primary transition-colors">Financial Tips</Link></li>
                  <li><Link to="/chat" className="hover:text-primary transition-colors">Start Chat</Link></li>
                </ul>
              </div>

              {/* Column 4: Social Media */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Connect</h3>
                <div className="flex justify-center md:justify-start space-x-4">
                  {/* Keeping placeholder links as official KudiGuard social media URLs are not provided */}
                  <a href="https://facebook.com/kudiguard" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-6 w-6" />
                  </a>
                  <a href="https://twitter.com/kudiguard" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-6 w-6" />
                  </a>
                  <a href="https://instagram.com/kudiguard" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} KudiGuard. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;