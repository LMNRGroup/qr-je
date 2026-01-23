import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignUp(true);
    }
  }, [searchParams]);

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

    setLoading(true);
    
    const { error } = isSignUp 
      ? await signUp(email, password, { fullName, username })
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      if (isSignUp) {
        toast.success('Account created! Check your email to confirm.');
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Lightweight animated background - CSS only, no JS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f14] via-[#1a1f2e] to-[#0b0f14]" />
        
        {/* Animated gradient orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s', animationDelay: '2s' }}
        />
        
        {/* Subtle floating QR code shapes - lightweight CSS animation */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/4 left-1/3 w-40 h-40 border-2 border-primary/50 rounded-lg rotate-12 animate-float-slow" />
          <div className="absolute bottom-1/3 right-1/4 w-32 h-32 border-2 border-cyan-400/50 rounded-lg -rotate-12 animate-float-slow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 right-1/3 w-28 h-28 border-2 border-amber-400/50 rounded-lg rotate-45 animate-float-slow" style={{ animationDelay: '3s' }} />
          <div className="absolute top-2/3 left-1/4 w-36 h-36 border-2 border-primary/50 rounded-lg -rotate-45 animate-float-slow" style={{ animationDelay: '4.5s' }} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
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
          className="glass-panel rounded-2xl p-8 bg-[#121621]/80 border border-white/5"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Input
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.slice(0, 18))}
                    className="h-12 bg-secondary/50 border-border focus:border-primary input-glow"
                  />
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary input-glow"
                />
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
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 text-primary-foreground font-medium glow"
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
              )}
            </button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Login;
