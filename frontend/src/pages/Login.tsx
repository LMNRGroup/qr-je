import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Lock, Mail, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FloatingParticles } from '@/components/FloatingParticles';
import { checkUsernameAvailability } from '@/lib/api';

const Login = () => {
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
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignUp(true);
    } else {
      // Default to login form (not signup)
      setIsSignUp(false);
    }
  }, [searchParams]);

  // Prevent body scrolling on login page (PWA/mobile)
  // Force dark mode on login page to ensure consistent styling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Force dark mode on login page
    document.documentElement.classList.add('dark');
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      // Note: We don't remove 'dark' class on unmount to avoid flicker
      // The theme system will handle it if user navigates away
    };
  }, []);

  // Check username availability
  const handleUsernameBlur = async () => {
    if (!isSignUp || !username.trim()) {
      setUsernameTouched(false);
      return;
    }
    
    setUsernameTouched(true);
    setUsernameChecking(true);
    
    try {
      const result = await checkUsernameAvailability(username.trim());
      if (result.available) {
        setUsernameAvailable(true);
      } else {
        setUsernameAvailable(false);
        toast.error(result.message || 'Username is already taken');
      }
    } catch (error) {
      console.error('Failed to check username availability:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // Check email availability (by attempting signup - Supabase will error if email exists)
  const handleEmailBlur = async () => {
    if (!isSignUp || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailTouched(false);
      return;
    }
    
    setEmailTouched(true);
    setEmailChecking(true);
    
    // Note: We can't check email availability without attempting signup
    // Supabase doesn't expose a direct email check endpoint
    // So we'll check it during actual signup and show error then
    // For now, we'll just mark it as "checking" and let the signup handle it
    setEmailChecking(false);
    setEmailAvailable(null); // Will be determined during signup
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (isSignUp && (!fullName.trim() || !username.trim())) {
      toast.error('Please add your full name and username');
      return;
    }
    if (isSignUp && !acceptedTerms) {
      toast.error('Please accept the Terms & Conditions');
      return;
    }
    if (isSignUp && usernameAvailable === false) {
      toast.error('Please choose an available username');
      return;
    }

    setLoading(true);
    
    const { error } = isSignUp 
      ? await signUp(email, password, { fullName, username })
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      // Check if error is due to email already in use
      const errorLower = error.message.toLowerCase();
      if (isSignUp && (
        errorLower.includes('email') && errorLower.includes('already') ||
        errorLower.includes('user already registered') ||
        errorLower.includes('already registered') ||
        error.code === 'signup_disabled' // Some Supabase configs return this
      )) {
        setEmailAvailable(false);
        setEmailTouched(true);
        toast.error('This email is already in use');
      } else {
        toast.error(error.message);
      }
    } else {
      if (isSignUp) {
        toast.success('Account created! Check your email to confirm.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setUsername('');
        setAcceptedTerms(false);
        setUsernameAvailable(null);
        setEmailAvailable(null);
        setUsernameTouched(false);
        setEmailTouched(false);
        navigate('/login');
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    }
  };

  // Check if form is valid for signup
  const isFormValid = isSignUp
    ? email.trim() &&
      password.trim() &&
      fullName.trim() &&
      username.trim() &&
      acceptedTerms &&
      usernameAvailable === true &&
      emailAvailable !== false // Allow null (not checked yet) but not false
    : email.trim() && password.trim();

  return (
    <div className="h-full bg-[#0b0f14] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Static background - base gradient */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
      </div>

      {/* Floating Particles Background - ONLY on Login page */}
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
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 sm:p-8 bg-[#121621]/90 backdrop-blur-2xl border border-white/10 shadow-xl"
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
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-12 bg-secondary/50 border-border focus:border-primary input-glow"
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
                            onChange={(e) => {
                              setUsername(e.target.value.slice(0, 18));
                              // Reset availability when user types
                              if (usernameTouched) {
                                setUsernameAvailable(null);
                              }
                            }}
                            onBlur={handleUsernameBlur}
                            className={`h-12 bg-secondary/50 border-border focus:border-primary input-glow pr-10 ${
                              usernameTouched
                                ? usernameAvailable === true
                                  ? 'border-green-500/50 focus:border-green-500'
                                  : usernameAvailable === false
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : ''
                                : ''
                            }`}
                          />
                          {usernameTouched && !usernameChecking && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {usernameAvailable === true && (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              {usernameAvailable === false && (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                          {usernameChecking && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
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
                        onChange={(e) => {
                          setEmail(e.target.value);
                          // Reset availability when user types
                          if (emailTouched && emailAvailable === false) {
                            setEmailAvailable(null);
                          }
                        }}
                        onBlur={handleEmailBlur}
                        className={`pl-10 pr-10 h-12 bg-secondary/50 border-border focus:border-primary input-glow ${
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
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary input-glow"
                      />
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 accent-primary"
                        />
                        <span>
                          I agree to the Terms & Conditions and subscribe for free updates.
                        </span>
                      </label>
                      <div className="pl-6">
                        <Link
                          to="/terms"
                          target="_blank"
                          className="text-xs text-primary hover:text-primary/80 underline transition-colors"
                        >
                          See terms and conditions
                        </Link>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className={`w-full h-12 font-medium glow ${
                      isFormValid
                        ? 'bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 text-primary-foreground'
                        : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
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
                </form>

                <div className="mt-6 text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setEmail('');
                      setPassword('');
                      setFullName('');
                      setUsername('');
                      setAcceptedTerms(false);
                      // Reset validation states
                      setUsernameAvailable(null);
                      setEmailAvailable(null);
                      setUsernameTouched(false);
                      setEmailTouched(false);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isSignUp ? (
                      <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                    ) : (
                      <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                    )}
                  </button>
                  {!isSignUp && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Placeholder for forgot password - do nothing until email flow is setup
                          toast.info('Password reset feature coming soon');
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors block"
                      >
                        Forgot my password
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors block"
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
};

export default Login;
