'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { FloatingParticles } from '@/components/FloatingParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';

const PAGE_SHELL =
  'relative h-full min-h-0 overflow-x-hidden overflow-y-auto bg-[#0b0f14] px-4 text-foreground lg:h-[calc(100dvh-var(--qrc-footer-h,0px))]';

export function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      setHasValidSession(false);
      return;
    }

    // Supabase establishes a recovery session when the user follows the reset
    // link; verify it (or the recovery token in the URL) before allowing a reset.
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && (session.user?.recovery_sent_at || searchParams.get('token'))) {
          setHasValidSession(true);
        } else {
          const token = searchParams.get('token');
          const type = searchParams.get('type');
          if (token && type === 'recovery') {
            const {
              data: { session: newSession },
            } = await supabase.auth.getSession();
            setHasValidSession(Boolean(newSession));
          } else {
            setHasValidSession(false);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        setHasValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error('Authentication is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) {
        toast.error(error.message || 'Failed to update password. Please try again.');
        return;
      }
      toast.success('Password updated successfully!');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#0b0f14] p-4 text-foreground lg:h-[calc(100dvh-var(--qrc-footer-h,0px))]">
        <div className="fixed inset-0 -z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
        </div>
        <FloatingParticles count={40} speed={0.6} sizeRange={[2, 6]} opacityRange={[0.15, 0.4]} />
        <div className="relative z-10 w-full max-w-md text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className={PAGE_SHELL}>
        <div className="fixed inset-0 -z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
        </div>
        <FloatingParticles count={40} speed={0.6} sizeRange={[2, 6]} opacityRange={[0.15, 0.4]} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6 sm:py-8"
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
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 rounded-2xl border border-white/10 bg-[#121621]/90 p-6 text-center shadow-xl backdrop-blur-2xl sm:p-8"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Invalid or expired link</h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                asChild
                className="glow w-full bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:opacity-90"
              >
                <Link href="/forgot-password">Request new reset link</Link>
              </Button>
              <Button asChild type="button" variant="ghost" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={PAGE_SHELL}>
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
      </div>

      <FloatingParticles count={40} speed={0.6} sizeRange={[2, 6]} opacityRange={[0.15, 0.4]} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6 sm:py-8"
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
          <p className="mt-1 text-sm text-muted-foreground">Set your new password</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-[#121621]/90 p-6 shadow-xl backdrop-blur-2xl sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-glow h-12 border-border bg-secondary/50 pl-10 focus:border-primary"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters long.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="input-glow h-12 border-border bg-secondary/50 pl-10 focus:border-primary"
                    disabled={loading}
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {password && confirmPassword && password === confirmPassword && (
                  <p className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !password.trim() ||
                    !confirmPassword.trim() ||
                    password !== confirmPassword
                  }
                  className={`glow h-12 w-full font-medium ${
                    password.trim() &&
                    confirmPassword.trim() &&
                    password === confirmPassword &&
                    !loading
                      ? 'bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:opacity-90'
                      : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Update password
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
        </motion.div>
      </motion.div>
    </div>
  );
}
