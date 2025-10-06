import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Navigation from '@/components/Navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  ChevronDown, 
  MessageCircle, 
  Mail, 
  Phone,
  Clock,
  AlertCircle,
  Facebook, 
  Twitter,  
  Instagram 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnimateOnScroll } from '@/hooks/use-animate-on-scroll';
import kudiGuardLogo from '@/assets/kudiguard-logo.png'; // Added kudiGuardLogo import

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const Help = () => {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const { toast } = useToast();

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How accurate are KudiGuard\'s recommendations?',
      answer: 'KudiGuard uses proven financial principles and your specific business data to provide recommendations. While we aim for high accuracy, our advice is guidance-based and you should always consider your unique circumstances. We recommend starting with small implementations and monitoring results.',
      category: 'General'
    },
    {
      id: '2',
      question: 'What information do I need to provide for analysis?',
      answer: 'To get the best recommendations, you\'ll need your monthly revenue, monthly expenses, current savings, and staff payroll (if applicable). The more accurate your data, the better our advice will be.',
      category: 'Getting Started'
    },
    {
      id: '3',
      question: 'Is my financial data secure?',
      answer: 'Yes, absolutely. We use bank-level encryption to protect your data. Your financial information is never shared with third parties and is stored securely. We only use it to provide you with personalized recommendations.',
      category: 'Security'
    },
    {
      id: '4',
      question: 'Can I use KudiGuard for any type of business?',
      answer: 'KudiGuard is specifically designed for small vendors and retail businesses in Nigeria. While our principles can apply to other businesses, our recommendations are most accurate for traditional vendor operations like electronics, clothing, food, and general merchandise.',
      category: 'General'
    },
    {
      id: '5',
      question: 'What if I disagree with a recommendation?',
      answer: 'Our recommendations are conservative and err on the side of caution. If you disagree, consider whether you have additional information we don\'t (like a guaranteed large order coming in). You can always ask follow-up questions or provide more context for a revised analysis.',
      category: 'Using KudiGuard'
    },
    {
      id: '6',
      question: 'How often should I use KudiGuard?',
      answer: 'Use KudiGuard whenever you\'re facing a significant financial decision - hiring staff, taking loans, expanding inventory, or changing locations. For ongoing monitoring, monthly check-ins with updated financial data can help track your progress.',
      category: 'Using KudiGuard'
    },
    {
      id: '7',
      question: 'Can KudiGuard help with tax planning?',
      answer: 'KudiGuard focuses on operational financial decisions rather than tax planning. For tax advice, we recommend consulting with a qualified accountant familiar with Nigerian tax laws.',
      category: 'Limitations'
    },
    {
      id: '8',
      question: 'What if my business is seasonal?',
      answer: 'For seasonal businesses, provide your average monthly figures or specify which season you\'re asking about. Include any seasonal savings you\'ve built up, as this affects our recommendations significantly.',
      category: 'Using KudiGuard'
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const handleInputChange = (field: string, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  const categories = ['All', 'General', 'Getting Started', 'Using KudiGuard', 'Security', 'Limitations'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFAQs = faqs.filter(faq => 
    (selectedCategory === 'All' || faq.category === selectedCategory) &&
    (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
     faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="pt-16">
        
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 bg-hero-gradient text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6 animate-fade-in">
              <div className="bg-primary-foreground p-4 rounded-full shadow-lg">
                <HelpCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-primary-foreground mb-4 leading-tight animate-fade-in">
              How Can We Help You?
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto animate-fade-in">
              Find answers to your questions, get support, and learn more about KudiGuard.
            </p>
          </div>
        </section>

        {/* Quick Help Cards */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Quick Help Options
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose how you'd like to get support.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { 
                icon: MessageCircle, 
                title: "Chat Support", 
                description: "Get instant, AI-powered answers to your business questions. Best for quick advice.", 
                buttonText: "Start Chat", 
                link: "/chat" 
              },
              { 
                icon: Mail, 
                title: "Email Support", 
                description: "Send us detailed inquiries. We aim to respond within 24 hours.", 
                buttonText: "Send Email", 
                link: "mailto:support@kudiguard.com" 
              },
              { 
                icon: Phone, 
                title: "Phone Support", 
                description: "Speak directly with our support team during business hours.", 
                buttonText: "Call Now", 
                link: "tel:+234800KUDIGUARD" 
              }
            ].map((item, index) => {
              const { ref, isVisible } = useAnimateOnScroll({ delay: index * 100 });
              return (
                <div 
                  key={index} 
                  ref={ref}
                  className={`
                    ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
                  `}
                >
                  <Card className="shadow-card hover:shadow-lg transition-all duration-300 h-full">
                    <CardContent className="p-6 text-center flex flex-col items-center justify-center">
                      <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold mb-2 text-xl text-primary">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-grow">{item.description}</p>
                      <Link to={item.link} className="mt-auto">
                        <Button variant="outline" size="sm">{item.buttonText}</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        {/* Support Hours */}
        <section className="container mx-auto px-4 pb-16">
          <Card className="shadow-card mb-8 bg-success-light border-success/20 max-w-5xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-success mr-3" />
                <div>
                  <p className="font-medium text-success">Support Hours</p>
                  <p className="text-sm text-success/80">Monday - Friday: 8:00 AM - 6:00 PM (WAT) | Saturday: 10:00 AM - 4:00 PM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find quick answers to the most common questions about KudiGuard.
            </p>
          </div>
          <Card className="shadow-card mb-8 max-w-5xl mx-auto">
            <CardHeader>
              <Input
                type="text"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 h-12"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category ? "bg-gradient-primary" : ""}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq, index) => {
                    const { ref, isVisible } = useAnimateOnScroll({ delay: index * 50 });
                    return (
                      <div 
                        key={faq.id} 
                        ref={ref}
                        className={`
                          ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
                        `}
                      >
                        <Collapsible
                          open={openFAQ === faq.id}
                          onOpenChange={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full text-left justify-between p-4 h-auto font-medium hover:bg-accent"
                            >
                              <span>{faq.question}</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${
                                openFAQ === faq.id ? 'rotate-180' : ''
                              }`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-4">
                            <div className="bg-accent rounded p-4">
                              <p className="text-muted-foreground">{faq.answer}</p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No FAQs match your search or filter criteria.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact Form */}
        <section className="container mx-auto px-4 py-16">
          <Card className="shadow-card max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Still Need Help?</CardTitle>
              <p className="text-muted-foreground">Send us a message and we'll get back to you soon</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={contactForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={contactForm.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full bg-gradient-primary hover:shadow-success"
                >
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Emergency Contact */}
        <section className="container mx-auto px-4 pb-16">
          <Card className="shadow-card mt-6 border-warning/20 bg-warning-light max-w-5xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-warning mr-3" />
                <div>
                  <p className="font-medium text-warning">Emergency Support</p>
                  <p className="text-sm text-warning/80">
                    For urgent business decisions that can't wait, call +234-800-KUDI-GUARD
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
              {/* Column 1: Logo and Tagline */}
              <div className="space-y-4 pb-8 mb-8 border-b border-border md:pb-0 md:mb-0 md:border-b-0">
                <Link to="/" className="flex items-center justify-center md:justify-start">
                  <img src={kudiGuardLogo} alt="KudiGuard" className="h-10 w-auto" />
                </Link>
                <p className="text-sm text-muted-foreground">
                  Empowering Nigerian vendors with smart financial decisions.
                </p>
              </div>

              {/* Column 2: Company Links */}
              <div className="space-y-4 pb-8 mb-8 border-b border-border md:pb-0 md:mb-0 md:border-b-0">
                <h3 className="text-lg font-semibold text-primary mb-4">Company</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                  <li><Link to="/help" className="hover:text-primary transition-colors">Contact Us</Link></li>
                </ul>
              </div>

              {/* Column 3: Resources */}
              <div className="space-y-4 pb-8 mb-8 border-b border-border md:pb-0 md:mb-0 md:border-b-0">
                <h3 className="text-lg font-semibold text-primary mb-4">Resources</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link to="/tips" className="hover:text-primary transition-colors">Financial Tips</Link></li>
                  <li><Link to="/chat" className="hover:text-primary transition-colors">Start Chat</Link></li>
                </ul>
              </div>

              {/* Column 4: Social Media */}
              <div className="space-y-4"> {/* No bottom border for the last item */}
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

export default Help;