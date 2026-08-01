'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Lock, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

import { FloatingParticles } from '@/components/FloatingParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { checkUsernameAvailability } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation states
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showUsernameUnavailableOverlay, setShowUsernameUnavailableOverlay] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const isFormValid = isSignUp
    ? Boolean(
        email.trim() &&
          password.trim() &&
          fullName.trim() &&
          username.trim() &&
          acceptedTerms &&
          usernameAvailable === true &&
          emailAvailable !== false,
      )
    : Boolean(email.trim() && password.trim());

  // Explains why the submit button is disabled, but only after a submit attempt.
  const getValidationMessage = (): { message: string; isError: boolean } | null => {
    if (!isSignUp || loading || !submitAttempted) return null;
    if (signupError) return { message: signupError, isError: true };
    if (!fullName.trim()) return { message: 'Please enter your full name', isError: false };
    if (!username.trim()) return { message: 'Please enter a username', isError: false };
    if (!email.trim()) return { message: 'Please enter your email', isError: false };
    if (!password.trim()) return { message: 'Please enter a password', isError: false };
    if (!acceptedTerms)
      return {
        message: 'Please accept the Terms & Conditions and Privacy Policy',
        isError: false,
      };
    if (usernameTouched && usernameAvailable === false)
      return { message: 'Username is already taken. Please choose another.', isError: true };
    if (usernameTouched && usernameAvailable === null && !usernameChecking)
      return {
        message: 'Please check if your username is available (click outside the username field)',
        isError: false,
      };
    if (username.trim() && !usernameTouched)
      return {
        message: 'Please check if your username is available (click outside the username field)',
        isError: false,
      };
    if (emailTouched && emailAvailable === false)
      return { message: 'This email is already in use. Please use a different email.', isError: true };
    return null;
  };

  const validationMessage = getValidationMessage();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setUsername('');
    setAcceptedTerms(false);
    setUsernameAvailable(null);
    setEmailAvailable(null);
    setUsernameTouched(false);
    setEmailTouched(false);
    setSubmitAttempted(false);
    setSignupError(null);
    setShowUsernameUnavailableOverlay(false);
  };

  // Sync sign-up vs. sign-in mode from the ?mode=signup query param.
  useEffect(() => {
    setIsSignUp(searchParams.get('mode') === 'signup');
  }, [searchParams]);

  // Clear the "why is this disabled" hint once the form becomes valid.
  useEffect(() => {
    if (isSignUp && isFormValid) {
      setSubmitAttempted(false);
      setSignupError(null);
    }
  }, [isSignUp, isFormValid]);

  // Lock scrolling and force dark mode for the immersive login experience.
  useEffect(() => {
    const { body, documentElement: root } = document;
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    root.classList.add('dark');
    return () => {
      body.style.overflow = '';
      root.style.overflow = '';
      // Leave the `dark` class in place to avoid a flash on navigation; the
      // theme system reconciles it on the next route.
    };
  }, []);

  const handleUsernameBlur = async () => {
    if (!isSignUp || !username.trim()) {
      setUsernameTouched(false);
      setShowUsernameUnavailableOverlay(false);
      return;
    }

    setUsernameTouched(true);
    setUsernameChecking(true);
    setShowUsernameUnavailableOverlay(false);

    try {
      const result = await checkUsernameAvailability(username.trim());
      setUsernameAvailable(result.available);
      setShowUsernameUnavailableOverlay(!result.available);
    } catch (error) {
      console.error('Failed to check username availability:', error);
      setUsernameAvailable(null);
      setShowUsernameUnavailableOverlay(false);
    } finally {
      setUsernameChecking(false);
    }
  };

  // Supabase has no email-availability endpoint, so this is resolved during the
  // actual sign-up attempt. We only reset the "checking" indicator here.
  const handleEmailBlur = () => {
    if (!isSignUp || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setEmailTouched(false);
      return;
    }
    setEmailTouched(true);
    setEmailChecking(false);
    setEmailAvailable(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSignUp) {
      setSubmitAttempted(true);
      setSignupError(null);

      if (!fullName.trim()) return setSignupError('Please enter your full name');
      if (!username.trim()) return setSignupError('Please enter a username');
      if (!email.trim()) return setSignupError('Please enter your email');
      if (!password.trim()) return setSignupError('Please enter a password');
      if (password.length < 6) {
        setPassword('');
        return setSignupError('Password must be at least 6 characters long');
      }
      if (!acceptedTerms)
        return setSignupError('Please accept the Terms & Conditions and Privacy Policy');
      if (usernameAvailable !== true) {
        return setSignupError(
          usernameAvailable === false
            ? 'Username is already taken. Please choose another.'
            : 'Please check if your username is available (click outside the username field)',
        );
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        return setSignupError('Please enter a valid email address');
      }
    } else if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password, { fullName, username })
      : await signIn(email, password);
    setLoading(false);

    if (!error) {
      if (isSignUp) {
        toast.success('Account created! Check your email to confirm.');
        resetForm();
        setIsSignUp(false);
        router.push('/login');
      } else {
        toast.success('Welcome back!');
        router.push('/');
      }
      return;
    }

    const errorLower = error.message.toLowerCase();

    if (
      isSignUp &&
      ((errorLower.includes('email') && errorLower.includes('already')) ||
        errorLower.includes('user already registered') ||
        errorLower.includes('already registered') ||
        error.code === 'signup_disabled')
    ) {
      setEmailAvailable(false);
      setEmailTouched(true);
      setSignupError('This email is already in use. Please use a different email.');
    } else if (
      isSignUp &&
      errorLower.includes('password') &&
      (errorLower.includes('weak') ||
        errorLower.includes('invalid') ||
        errorLower.includes('too short'))
    ) {
      setPassword('');
      setSignupError('Password is too weak. Please use a stronger password.');
    } else if (
      !isSignUp &&
      (errorLower.includes('email not confirmed') ||
        errorLower.includes('user not found') ||
        error.code === 'email_not_confirmed')
    ) {
      toast.error('Account does not exist. Please sign up to create an account.', {
        action: {
          label: 'Sign Up',
          onClick: () => {
            resetForm();
            setIsSignUp(true);
          },
        },
      });
    } else if (
      !isSignUp &&
      (errorLower.includes('invalid password') ||
        errorLower.includes('wrong password') ||
        errorLower.includes('incorrect password') ||
        errorLower.includes('invalid login') ||
        errorLower.includes('invalid credentials') ||
        error.code === 'invalid_credentials')
    ) {
      setPassword('');
      toast.error('Incorrect password. Please try again.');
    } else if (isSignUp) {
      setSignupError(error.message || 'An error occurred. Please try again.');
    } else {
      toast.error(error.message || 'An error occurred. Please try again.');
    }
  };

  const toggleMode = () => {
    resetForm();
    setIsSignUp((value) => !value);
  };

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto px-4 text-foreground lg:h-[calc(100dvh-var(--qrc-footer-h,0px))] min-h-0 bg-[#0b0f14]">
      {/* Static background gradient */}
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
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center sm:mb-8">
          {/* Local static logo rendered via motion.img; egress/next-image work is deferred. */}
          <motion.img
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            src="/assets/QRC App Icon.png"
            alt="QR Code Studio"
            className="glow mb-4 h-16 w-16 rounded-2xl"
          />
          <h1 className="gradient-text text-2xl font-bold">QR Code Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form card */}
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
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="input-glow h-12 border-border bg-secondary/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        placeholder="username"
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value.slice(0, 18));
                          if (usernameTouched) {
                            setUsernameAvailable(null);
                            setShowUsernameUnavailableOverlay(false);
                          }
                        }}
                        onBlur={handleUsernameBlur}
                        className={`input-glow h-12 border-border bg-secondary/50 pr-10 focus:border-primary ${
                          usernameTouched && usernameAvailable === true
                            ? 'border-green-500/50 focus:border-green-500'
                            : usernameTouched && usernameAvailable === false
                              ? 'border-red-500/50 focus:border-red-500'
                              : ''
                        }`}
                      />
                      {usernameTouched && !usernameChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                          {usernameAvailable === false && <X className="h-4 w-4 text-red-500" />}
                        </div>
                      )}
                      {usernameChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <AnimatePresence>
                      {showUsernameUnavailableOverlay && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-red-400/50 bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            <span>Username is already taken. Please choose another.</span>
                            <button
                              type="button"
                              onClick={() => setShowUsernameUnavailableOverlay(false)}
                              className="ml-2 transition-opacity hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (emailTouched && emailAvailable === false) {
                        setEmailAvailable(null);
                      }
                    }}
                    onBlur={handleEmailBlur}
                    className={`input-glow h-12 border-border bg-secondary/50 pl-10 pr-10 focus:border-primary ${
                      emailTouched && emailAvailable === false
                        ? 'border-red-500/50 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {emailTouched && emailAvailable === false && (
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                  {emailChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
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
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <label className="flex items-start gap-3 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary underline transition-colors hover:text-primary/80"
                      >
                        Terms &amp; Conditions
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-primary underline transition-colors hover:text-primary/80"
                      >
                        Privacy Policy
                      </Link>{' '}
                      and subscribe for free updates.
                    </span>
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className={`glow h-12 w-full font-medium ${
                    isFormValid
                      ? 'bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:opacity-90'
                      : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                {isSignUp && !isFormValid && validationMessage && (
                  <p
                    className={`px-2 text-center text-xs ${
                      validationMessage.isError
                        ? 'font-medium text-red-500'
                        : 'text-muted-foreground/80'
                    }`}
                  >
                    {validationMessage.message}
                  </p>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-3 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <span className="font-medium text-primary">Sign in</span>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <span className="font-medium text-primary">Sign up</span>
                  </>
                )}
              </button>
              {!isSignUp && (
                <div className="flex flex-col items-center space-y-2">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Forgot my password
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/60"
                  >
                    Continue without account
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
