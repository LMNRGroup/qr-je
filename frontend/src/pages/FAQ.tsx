import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, ArrowLeft, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

const FAQ = () => {
  const navigate = useNavigate();
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/content/faq.json')
      .then((res) => res.json())
      .then((data) => {
        setFaqData(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: use inline data if fetch fails
        setFaqData([]);
        setLoading(false);
      });
  }, []);

  const categories = [
    'Getting Started',
    'Static vs Dynamic vs Adaptive QRC™',
    'Menus & Link Hubs',
    'Analytics / Intel',
    'Plans & Billing',
    'Security & Reliability',
    'Printing & Best Practices',
  ];

  const faqByCategory = categories.map((category) => ({
    category,
    items: faqData.filter((item) => item.category === category),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading FAQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Help Center</p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Frequently Asked Questions</h1>
            <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
            aria-label="Go back"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {faqByCategory.map(({ category, items }) => (
            <div key={category} className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {items.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="border-border/50">
                    <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pt-2">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Still have questions?</h2>
          <p className="text-sm text-muted-foreground">
            Contact us at{' '}
            <a href="mailto:support@luminarapps.com" className="text-primary hover:underline font-medium">
              support@luminarapps.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
