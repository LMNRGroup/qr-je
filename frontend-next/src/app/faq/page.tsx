import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';

import { BackButton } from '@/components/back-button';
import { FaqAccordion, type FaqItem } from './faq-accordion';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | QR Code Studio',
  description: 'Answers to common questions about QR Code Studio by Luminar Apps.',
};

const CATEGORIES = [
  'Getting Started',
  'Static vs Dynamic vs Adaptive QRC™',
  'Menus & Link Hubs',
  'Analytics / Intel',
  'Plans & Billing',
  'Security & Reliability',
  'Printing & Best Practices',
];

// The FAQ content is static JSON shipped in /public. Read it on the server at
// build/request time instead of fetching it from the client.
async function loadFaq(): Promise<FaqItem[]> {
  try {
    const file = path.join(process.cwd(), 'public', 'content', 'faq.json');
    return JSON.parse(await readFile(file, 'utf8')) as FaqItem[];
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const faqData = await loadFaq();
  const faqByCategory = CATEGORIES.map((category) => ({
    category,
    items: faqData.filter((item) => item.category === category),
  })).filter(({ items }) => items.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 space-y-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Help Center
              </p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-sm text-muted-foreground mt-2">QR Code Studio by Luminar Apps</p>
          </div>
          <BackButton />
        </div>

        <div className="space-y-6">
          {faqByCategory.map(({ category, items }) => (
            <div key={category} className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">{category}</h2>
              <FaqAccordion items={items} />
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Still have questions?</h2>
          <p className="text-sm text-muted-foreground">
            Contact us at{' '}
            <a
              href="mailto:support@luminarapps.com"
              className="text-primary hover:underline font-medium"
            >
              support@luminarapps.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
