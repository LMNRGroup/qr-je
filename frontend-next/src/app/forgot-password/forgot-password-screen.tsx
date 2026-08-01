'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { FloatingParticles } from '@/components/FloatingParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const appBaseUrl =
    (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL
    )?.replace(/\/$/, '') ?? 'https://qrcode.luminarapps.com';

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error('Authentication is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appBaseUrl}/reset-password`,
      });
      if (error) {
        toast.error(error.message || 'Failed to send reset email. Please try again.');
        return;
      }
      // Show success without revealing whether the email exists.
      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#0b0f14] p-4 text-foreground">
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
      </div>

      <FloatingParticles count={40} speed={0.6} sizeRange={[2, 6]} opacityRange={[0.15, 0.4]} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-h-full w-full max-w-md overflow-y-auto py-4"
      >
        <div className="mb-6 flex flex-col items-center sm:mb-8">
          {/* Local static logo via motion.img; egress/next-image work is deferred. */}
          <motion.img
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            src="/assets/QRC App Icon.png"
            alt="QR Code Studio"
            className="glow mb-4 h-16 w-16 rounded-2xl"
          />
          <h1 className="gradient-text text-2xl font-bold">QR Code Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reset your password</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-[#121621]/90 p-6 shadow-xl backdrop-blur-2xl sm:p-8"
        >
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/20 p-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists, we sent a reset link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or try again.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Send another email
                </Button>
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="input-glow h-12 border-border bg-secondary/50 pl-10 focus:border-primary"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className={`glow h-12 w-full font-medium ${
                      email.trim() && !loading
                        ? 'bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:opacity-90'
                        : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
