'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string[];
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
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
  );
}
