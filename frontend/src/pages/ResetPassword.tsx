import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FloatingParticles } from '@/components/FloatingParticles';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      setHasValidSession(false);
      return;
    }

    // Check if we have a valid recovery session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check if this is a recovery session (password recovery token)
        // Supabase sets a recovery session when user clicks the reset link
        if (session && (session.user?.recovery_sent_at || searchParams.get('token'))) {
          setHasValidSession(true);
        } else {
          // Try to exchange the token from URL if present
          const token = searchParams.get('token');
          const type = searchParams.get('type');
          
          if (token && type === 'recovery') {
            // Supabase handles this automatically via the redirect, but we can verify
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              setHasValidSession(true);
            } else {
              setHasValidSession(false);
            }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        toast.error(error.message || 'Failed to update password. Please try again.');
        return;
      }

      toast.success('Password updated successfully!');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="h-full bg-[#0b0f14] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 -z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
        </div>
        <FloatingParticles 
          count={40}
          speed={0.6}
          sizeRange={[2, 6]}
          opacityRange={[0.15, 0.4]}
        />
        <div className="w-full max-w-md relative z-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="h-full bg-[#0b0f14] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 -z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
        </div>
        <FloatingParticles 
          count={40}
          speed={0.6}
          sizeRange={[2, 6]}
          opacityRange={[0.15, 0.4]}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 max-h-full overflow-y-auto py-4"
        >
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              src="/assets/QRC App Icon.png"
              alt="QR Code Studio"
              className="h-16 w-16 rounded-2xl glow mb-4"
            />
            <h1 className="text-2xl font-bold gradient-text">QR Code Studio</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            transition={{ 
              delay: 0.1,
            }}
            className="rounded-2xl p-6 sm:p-8 bg-[#121621]/90 backdrop-blur-2xl border border-white/10 shadow-xl text-center space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Invalid or expired link</h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/forgot-password">
                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 text-primary-foreground glow"
                >
                  Request new reset link
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0b0f14] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Static background - base gradient */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
      </div>

      {/* Floating Particles Background */}
      <FloatingParticles 
        count={40}
        speed={0.6}
        sizeRange={[2, 6]}
        opacityRange={[0.15, 0.4]}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 max-h-full overflow-y-auto py-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <motion.img
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            src="/assets/QRC App Icon.png"
            alt="QR Code Studio"
            className="h-16 w-16 rounded-2xl glow mb-4"
          />
          <h1 className="text-2xl font-bold gradient-text">QR Code Studio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set your new password
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          transition={{ 
            delay: 0.1,
          }}
          className="rounded-2xl p-6 sm:p-8 bg-[#121621]/90 backdrop-blur-2xl border border-white/10 shadow-xl"
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary input-glow"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long.
                </p>
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary input-glow"
                    disabled={loading}
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {password && confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading || !password.trim() || !confirmPassword.trim() || password !== confirmPassword}
                  className={`w-full h-12 font-medium glow ${
                    password.trim() && confirmPassword.trim() && password === confirmPassword && !loading
                      ? 'bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 text-primary-foreground'
                      : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
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
                to="/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
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
};

export default ResetPassword;
