import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import useEmblaCarousel from 'embla-carousel-react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "KudiGuard helped me decide against a risky loan. My business is much more stable now!",
    author: "Aisha M.",
    business: "Textile Vendor, Kano"
  },
  {
    quote: "I used to guess with my inventory. Now, KudiGuard gives me clear advice, and my sales are up!",
    author: "Chinedu O.",
    business: "Electronics Seller, Lagos"
  },
  {
    quote: "Hiring my first staff felt overwhelming. KudiGuard's 'Wait' advice saved me from overspending too early.",
    author: "Fatima Y.",
    business: "Food Stall Owner, Abuja"
  },
  {
    quote: "The financial tips are gold! I've learned so much about managing my small shop's money.",
    author: "Tunde A.",
    business: "General Merchandise, Ibadan"
  }
];

const Testimonials = () => {
  const [emblaRef] = useEmblaCarousel({ loop: true });

  return (
    <section className="container mx-auto px-4 py-16 bg-accent/20 rounded-lg">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-primary mb-4">
          What Our Vendors Say
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Hear from Nigerian small business owners who are making smarter decisions with KudiGuard.
        </p>
      </div>

      <div className="embla max-w-4xl mx-auto" ref={emblaRef}>
        <div className="embla__container flex">
          {testimonials.map((testimonial, index) => (
            <div className="embla__slide flex-[0_0_100%] min-w-0 p-4" key={index}>
              <Card className="shadow-card h-full flex flex-col justify-between">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-lg italic text-foreground mb-4">
                    "{testimonial.quote}"
                  </p>
                  <p className="font-semibold text-primary">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;