import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

// For now, we'll use a static tip. In the future, this could be dynamic from a database.
const tipOfTheDay = {
  title: 'Track Your Daily Sales',
  content: 'Write down your daily sales and expenses. This simple habit helps you spot trends, identify your best days, and make better stocking decisions. Use a simple notebook or your phone.',
};

const TipOfTheDayCard = () => {
  return (
    <Card className="shadow-card bg-gradient-primary text-primary-foreground">
      <CardHeader>
        <div className="flex items-center">
          <Lightbulb className="h-6 w-6 mr-2" />
          <CardTitle className="text-xl">💡 Tip of the Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium mb-2">{tipOfTheDay.title}</p>
        <p className="text-primary-foreground/90">
          {tipOfTheDay.content}
        </p>
      </CardContent>
    </Card>
  );
};

export default TipOfTheDayCard;