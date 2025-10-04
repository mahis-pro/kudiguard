import React, { useState } from 'react';
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
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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
    selectedCategory === 'All' || faq.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-4xl mx-auto p-4 pt-16"> {/* Added pt-16 */}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-full">
              <HelpCircle className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Help & Support</h1>
          <p className="text-muted-foreground">Find answers to common questions or get in touch</p>
        </div>

        {/* Quick Help Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Chat Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Get instant help with your questions</p>
              <Button variant="outline" size="sm">Start Chat</Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Send detailed questions via email</p>
              <Button variant="outline" size="sm">Send Email</Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Phone Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Speak directly with our team</p>
              <Button variant="outline" size="sm">Call Now</Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Hours */}
        <Card className="shadow-card mb-8 bg-success-light border-success/20">
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

        {/* FAQ Section */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            <div className="flex flex-wrap gap-2 mt-4">
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
              {filteredFAQs.map((faq) => (
                <Collapsible
                  key={faq.id}
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Still Need Help?</CardTitle>
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

        {/* Emergency Contact */}
        <Card className="shadow-card mt-6 border-warning/20 bg-warning-light">
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
      </div>
    </div>
  );
};

export default Help;