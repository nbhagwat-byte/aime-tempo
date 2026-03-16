import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/app/types';
import { supabase } from '@/app/utils/supabaseClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  currentUser: User | null;
  status: AuthStatus;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error || !data.session?.user) {
          setCurrentUser(null);
          setStatus('unauthenticated');
          return;
        }

        const { user } = data.session;
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, hourly_rate, language')
          .eq('id', user.id)
          .single();

        if (!active) return;
        if (profileError || !profile) {
          setCurrentUser(null);
          setStatus('unauthenticated');
          return;
        }

        setCurrentUser({
          id: user.id,
          email: user.email ?? '',
          name: profile.full_name ?? user.email ?? 'User',
          role: profile.role,
          hourlyRate: Number(profile.hourly_rate ?? 0),
          language: profile.language ?? 'en',
        });
        setStatus('authenticated');
      } catch (_err) {
        if (!active) return;
        setCurrentUser(null);
        setStatus('unauthenticated');
      }
    }

    void hydrate();

    const timeoutId = window.setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'unauthenticated' : prev));
    }, 8000);

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setCurrentUser(null);
        setStatus('unauthenticated');
        return;
      }

      setStatus('loading');
      const { user } = session;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, hourly_rate, language')
        .eq('id', user.id)
        .single();

      if (!active) return;
      if (profileError || !profile) {
        setCurrentUser(null);
        setStatus('unauthenticated');
        return;
      }

      setCurrentUser({
        id: user.id,
        email: user.email ?? '',
        name: profile.full_name ?? user.email ?? 'User',
        role: profile.role,
        hourlyRate: Number(profile.hourly_rate ?? 0),
        language: profile.language ?? 'en',
      });
      setStatus('authenticated');
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    setStatus('loading');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('unauthenticated');
      throw error;
    }
  };

  const signOut = async () => {
    setStatus('loading');
    const { error } = await supabase.auth.signOut();
    if (error) {
      // If sign out fails, keep the best-known state.
      setStatus(currentUser ? 'authenticated' : 'unauthenticated');
      throw error;
    }
    setCurrentUser(null);
    setStatus('unauthenticated');
  };

  const value = useMemo<AuthContextType>(
    () => ({ currentUser, status, signInWithPassword, signOut }),
    [currentUser, status]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
