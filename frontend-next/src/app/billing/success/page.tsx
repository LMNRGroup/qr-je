'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { syncBillingStatus } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BillingSuccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    let active = true;
    syncBillingStatus()
      .then(() => {
        if (active) router.replace('/?billing=success');
      })
      .catch((syncError) => {
        if (active) {
          setError(syncError instanceof Error ? syncError.message : 'Subscription sync failed.');
        }
      });

    return () => {
      active = false;
    };
  }, [loading, router, syncAttempt, user]);

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center px-4">
      <section className="glass-panel w-full max-w-md rounded-2xl border border-border/60 p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Billing</p>
          <h1 className="text-xl font-semibold">Confirming subscription</h1>
          <p className="text-sm text-muted-foreground">{error ?? 'Refreshing your plan from Stripe.'}</p>
        </div>
        {error ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => {
              setError(null);
              setSyncAttempt((attempt) => attempt + 1);
            }}>
              Retry
            </Button>
            <Button type="button" variant="outline" onClick={() => router.replace('/?billing=success')}>
              Return to app
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing plan
          </div>
        )}
      </section>
    </main>
  );
}
