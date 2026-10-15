import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Business } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  business: Business | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('memberships')
      .select('business_id, businesses(*)')
      .eq('user_id', userId)
      .single();
    if (data?.businesses) {
      setBusiness(data.businesses as unknown as Business);
    } else {
      setBusiness(null);
    }
  }, []);

  const refreshBusiness = useCallback(async () => {
    if (user) await fetchBusiness(user.id);
  }, [user, fetchBusiness]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchBusiness(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchBusiness(s.user.id);
      } else {
        setBusiness(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchBusiness]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setBusiness(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, business, loading, signOut, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
