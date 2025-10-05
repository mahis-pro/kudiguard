import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Calculator, 
  CheckCircle, 
  ArrowRight,
  AlertTriangle, 
  Facebook, 
  Twitter,  
  Instagram,
  PiggyBank // Added PiggyBank import
} from 'lucide-react';
import kudiGuardLogo from '@/assets/kudiguard-logo.png';
import HowItWorks from '@/components/HowItWorks'; 
import { useAnimateOnScroll } from '@/hooks/use-animate-on-scroll'; 

const About = () => {
  const benefits = [
    {
      icon: CheckCircle,
      title: "Confident Decisions",
      description: "Make financial choices with clarity and certainty, backed by data."
    },
    {
      icon: AlertTriangle, 
      title: "Avoid Costly Mistakes",
      description: "Identify and steer clear of financial pitfalls that can harm your business."
    },
    {
      icon: TrendingUp,
      title: "Sustainable Growth",
      description: "Implement strategies that foster long-term stability and expansion."
    }, 
    {
      icon: PiggyBank,
      title: "Smart Savings",
      description: "Optimize your savings strategy for emergencies and future investments."
    },
    {
      icon: Users,
      title: "Effective Staffing",
      description: "Receive guidance on when and how to expand your team responsibly."
    },
    {
      icon: Calculator,
      title: "Optimized Inventory",
      description: "Manage your stock efficiently to maximize sales and minimize waste."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="pt-16"> 
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 bg-hero-gradient text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6 animate-fade-in">
              <div className="bg-primary-foreground p-4 rounded-full shadow-lg">
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-primary-foreground mb-4 leading-tight animate-fade-in">
              Empowering Nigerian Vendors
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto animate-fade-in">
              KudiGuard is your dedicated AI financial advisor, built to help small business owners in Nigeria make smarter, data-driven decisions for sustainable growth.
            </p>
            <div className="animate-fade-in">
              <Link to="/signup">
                <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="container mx-auto px-4 py-16">
          <Card className="shadow-card bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl text-center text-primary font-bold">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-lg text-foreground leading-relaxed max-w-3xl mx-auto">
                We are committed to democratizing financial intelligence for small businesses across Nigeria. By providing accessible, personalized, and actionable advice, KudiGuard aims to transform uncertainty into confidence, fostering economic resilience and growth within local communities.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* How It Works Section - Reusing the component */}
        <HowItWorks />

        {/* Why Choose KudiGuard / Benefits Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Why KudiGuard is Your Best Partner
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide the tools and insights you need to thrive in Nigeria's dynamic market.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => {
              const { ref, isVisible } = useAnimateOnScroll({ delay: index * 100 });
              return (
                <Card 
                  key={index} 
                  ref={ref}
                  className={`shadow-card hover:shadow-lg transition-all duration-300 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="bg-gradient-primary w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-primary py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Ready to Make Smarter Financial Moves?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join thousands of Nigerian vendors who are already transforming their businesses with KudiGuard.
            </p>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4 hover:shadow-success">
                Start Your Journey
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

export default About;