import React from 'react';
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
  MessageCircle,
  PiggyBank,
  Target
} from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "Ask Questions",
      description: "Get instant answers to your business financial questions in plain language"
    },
    {
      icon: Calculator,
      title: "Smart Analysis",
      description: "Our AI analyzes your revenue, expenses, and savings to give personalized advice"
    },
    {
      icon: CheckCircle,
      title: "Clear Recommendations",
      description: "Receive clear 'Do it' or 'Wait' decisions with detailed explanations"
    },
    {
      icon: Target,
      title: "Action Steps",
      description: "Get specific next steps to implement our recommendations safely"
    }
  ];

  const benefits = [
    "Make confident financial decisions",
    "Avoid costly business mistakes",
    "Grow your business sustainably", 
    "Build emergency funds properly",
    "Plan staff hiring effectively",
    "Manage inventory smartly"
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle"> {/* Removed p-4 */}
      <Navigation /> {/* Moved outside */}
      <div className="max-w-4xl mx-auto p-4"> {/* Added p-4 for content */}
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-primary p-4 rounded-full">
              <Shield className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            About KudiGuard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your trusted financial advisor for smart business decisions. 
            Built specifically for Nigerian small vendors.
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg text-foreground leading-relaxed">
              We believe every small business owner deserves access to smart financial advice. 
              KudiGuard combines your business data with proven financial principles to help 
              you make confident decisions that grow your business safely.
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">How KudiGuard Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-success-light p-3 rounded-full">
                    <feature.icon className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Why Choose KudiGuard?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card text-center">
            <CardContent className="p-6">
              <TrendingUp className="h-8 w-8 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-primary">100%</h3>
              <p className="text-muted-foreground">Focus on Nigerian vendors</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card text-center">
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-primary">Smart</h3>
              <p className="text-muted-foreground">AI-powered recommendations</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card text-center">
            <CardContent className="p-6">
              <PiggyBank className="h-8 w-8 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-primary">Safe</h3>
              <p className="text-muted-foreground">Conservative financial advice</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Make Smart Decisions?</h2>
            <p className="mb-6 text-primary-foreground/90">
              Join thousands of vendors who trust KudiGuard for their financial decisions
            </p>
            <Link to="/">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Start Using KudiGuard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;