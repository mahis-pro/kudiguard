import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { 
  BookOpen, 
  TrendingUp, 
  PiggyBank, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Calculator,
  Target,
  DollarSign
} from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  category: string;
  icon: any;
  content: string;
  keyPoints: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  readTime: string;
}

const FinancialTips = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const tips: Tip[] = [
    {
      id: '1',
      title: 'Building Your Emergency Fund',
      category: 'Savings',
      icon: PiggyBank,
      difficulty: 'Beginner',
      readTime: '5 min',
      content: 'An emergency fund is your financial safety net. As a small business owner, unexpected expenses can arise at any time - equipment breakdown, slow sales periods, or supply chain issues.',
      keyPoints: [
        'Start with ₦50,000 as your initial goal',
        'Gradually build to 3-6 months of expenses',
        'Keep emergency funds in a separate savings account',
        'Only use for true emergencies, not opportunities'
      ]
    },
    {
      id: '2',
      title: 'When to Hire Your First Employee',
      category: 'Staffing',
      icon: Users,
      difficulty: 'Intermediate',
      readTime: '7 min',
      content: 'Hiring your first employee is a big step. It means you\'re growing, but it also means new responsibilities and costs. Here\'s how to know when you\'re ready.',
      keyPoints: [
        'Your monthly profit should be 3x the employee salary',
        'Have at least ₦100,000 in emergency savings',
        'Track if you\'re consistently turning away customers',
        'Consider part-time or contract work first'
      ]
    },
    {
      id: '3',
      title: 'Smart Inventory Management',
      category: 'Inventory',
      icon: Calculator,
      difficulty: 'Intermediate',
      readTime: '6 min',
      content: 'Proper inventory management can make or break your cash flow. Too much inventory ties up money, too little loses sales.',
      keyPoints: [
        'Track which products sell fastest',
        'Use the 80/20 rule - 20% of products generate 80% of profit',
        'Don\'t stock more than 2 months of slow-moving items',
        'Negotiate payment terms with suppliers'
      ]
    },
    {
      id: '4',
      title: 'Understanding Business Loans',
      category: 'Financing',
      icon: DollarSign,
      difficulty: 'Advanced',
      readTime: '10 min',
      content: 'Business loans can fuel growth, but they can also create problems if not used wisely. Here\'s what you need to know before borrowing.',
      keyPoints: [
        'Only borrow what you can repay from current profits',
        'Interest rates in Nigeria range from 15-35% annually',
        'Have a clear plan for how the loan will increase revenue',
        'Consider microfinance banks for smaller amounts'
      ]
    },
    {
      id: '5',
      title: 'Pricing Your Products for Profit',
      category: 'Pricing',
      icon: Target,
      difficulty: 'Beginner',
      readTime: '4 min',
      content: 'Many vendors underprice their products, thinking lower prices mean more sales. But pricing too low can kill your business.',
      keyPoints: [
        'Calculate your true cost including time and overhead',
        'Add at least 40-60% markup for healthy margins',
        'Research competitor prices in your area',
        'Don\'t compete only on price - add value instead'
      ]
    },
    {
      id: '6',
      title: 'Managing Seasonal Cash Flow',
      category: 'Cash Flow',
      icon: TrendingUp,
      difficulty: 'Intermediate',
      readTime: '8 min',
      content: 'Most businesses have seasonal ups and downs. Smart vendors prepare for both busy and slow periods.',
      keyPoints: [
        'Save extra profits during good months',
        'Identify your business\'s seasonal patterns',
        'Plan marketing campaigns for slow periods',
        'Consider complementary products for off-seasons'
      ]
    }
  ];

  const categories = ['all', 'Savings', 'Staffing', 'Inventory', 'Financing', 'Pricing', 'Cash Flow'];

  const filteredTips = tips.filter(tip => 
    selectedCategory === 'all' || tip.category === selectedCategory
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-success-light text-success';
      case 'Intermediate': return 'bg-warning-light text-warning';
      case 'Advanced': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle"> {/* Removed p-4 */}
      <Navigation /> {/* Moved outside */}
      <div className="max-w-4xl mx-auto p-4"> {/* Added p-4 for content */}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Financial Tips</h1>
          <p className="text-muted-foreground">Expert advice to grow your business smartly and safely</p>
        </div>

        {/* Featured Tip */}
        <Card className="shadow-card mb-8 bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <div className="flex items-center">
              <Lightbulb className="h-6 w-6 mr-2" />
              <CardTitle className="text-xl">💡 Tip of the Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium mb-2">Track Your Daily Sales</p>
            <p className="text-primary-foreground/90">
              Write down your daily sales and expenses. This simple habit helps you spot trends, 
              identify your best days, and make better stocking decisions. Use a simple notebook or your phone.
            </p>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card className="shadow-card mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-gradient-primary" : ""}
                >
                  {category === 'all' ? 'All Tips' : category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTips.map((tip) => (
            <Card key={tip.id} className="shadow-card hover:shadow-success transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className="bg-primary-light/20 p-2 rounded-full mr-3">
                      <tip.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline">{tip.category}</Badge>
                  </div>
                  <div className="text-right">
                    <Badge className={getDifficultyColor(tip.difficulty)}>
                      {tip.difficulty}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg">{tip.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{tip.readTime} read</p>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground mb-4">{tip.content}</p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Key Points:</h4>
                  <ul className="space-y-1">
                    {tip.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <CheckCircle className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <Card className="shadow-card mt-8 bg-success-light border-success/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-success mx-auto mb-4" />
            <h3 className="text-lg font-bold text-success mb-2">Need Personalized Advice?</h3>
            <p className="text-success/80 mb-4">
              These tips are general guidelines. For advice specific to your business situation, 
              use KudiGuard's decision tool with your actual financial data.
            </p>
            <Button className="bg-gradient-primary">
              Ask KudiGuard a Question
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialTips;