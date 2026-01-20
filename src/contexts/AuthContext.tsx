/**
 * CLOUD-SYNC-CRITICAL: Auth Context using Supabase Auth
 * This provides the single source of truth for user authentication.
 * All auth operations go through Supabase for proper RLS enforcement.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyProfitPassword: (password: string) => Promise<boolean>;
  setProfitPassword: (password: string) => Promise<boolean>;
  hasProfitPassword: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profitPasswordHash, setProfitPasswordHash] = useState<string | null>(null);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // CLOUD-SYNC-CRITICAL: Initialize auth state from Supabase
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Load profit password from profile if user exists
      if (session?.user?.id) {
        loadProfitPassword(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (session?.user?.id) {
          loadProfitPassword(session.user.id);
        } else {
          setProfitPasswordHash(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load profit password hash from profiles table
  const loadProfitPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profit_password_hash')
        .eq('user_id', userId)
        .single();
      
      if (!error && data) {
        setProfitPasswordHash((data as { profit_password_hash?: string }).profit_password_hash || null);
      }
    } catch (error) {
      console.error('Error loading profit password:', error);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in"
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Account Created!",
        description: "Welcome to Offline POS"
      });

      return true;
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfitPasswordHash(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
  }, []);

  const hasProfitPassword = useCallback((): boolean => {
    return !!profitPasswordHash;
  }, [profitPasswordHash]);

  const setProfitPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Simple hash for profit password (not for sensitive auth)
      const hash = btoa(password);
      
      const { error } = await supabase
        .from('profiles')
        .update({ profit_password_hash: hash })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfitPasswordHash(hash);

      toast({
        title: "Profit Password Set",
        description: "Your profit records are now protected"
      });

      return true;
    } catch (error) {
      console.error('Set profit password error:', error);
      toast({
        title: "Error",
        description: "Failed to set profit password",
        variant: "destructive"
      });
      return false;
    }
  }, [user?.id]);

  const verifyProfitPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!profitPasswordHash) return false;
    return btoa(password) === profitPasswordHash;
  }, [profitPasswordHash]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isOnline,
        login,
        signup,
        logout,
        verifyProfitPassword,
        setProfitPassword,
        hasProfitPassword
      }}
    >
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
