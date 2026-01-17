import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_TOKEN_KEY = 'qrc.auth.token';
const LOCAL_SESSION_KEY = 'qrc.auth.session';

const writeLocalToken = (token?: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
  }
};

const writeLocalSession = (session?: Session | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (session?.access_token && session?.refresh_token) {
    localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    );
    return;
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
};

const readLocalSession = (): { access_token: string; refresh_token: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setUser(session?.user ?? null);
        writeLocalToken(session?.access_token ?? null);
        writeLocalSession(session);
        setLoading(false);
        return;
      }

      const storedSession = readLocalSession();
      if (storedSession) {
        const { data, error } = await supabase.auth.setSession(storedSession);
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          writeLocalToken(data.session.access_token ?? null);
          writeLocalSession(data.session);
        }
      }

      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        writeLocalToken(session?.access_token ?? null);
        writeLocalSession(session ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new AuthError('Supabase is not configured') };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      writeLocalToken(data.session?.access_token ?? null);
      writeLocalSession(data.session ?? null);
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new AuthError('Supabase is not configured') };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
      writeLocalToken(data.session.access_token);
      writeLocalSession(data.session);
    }
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    await supabase.auth.signOut();
    writeLocalToken(null);
    writeLocalSession(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
