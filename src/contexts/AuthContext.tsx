import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, User, generateId, now, AppSettings } from '@/lib/database';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  settings: AppSettings | null;
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

const SESSION_KEY = 'offline-pos-session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
          const { userId, email } = JSON.parse(sessionData);
          const existingUser = await db.users.get(userId);
          if (existingUser && existingUser.email === email) {
            setUser(existingUser);
            const userSettings = await db.appSettings.where('userId').equals(userId).first();
            setSettings(userSettings || null);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await db.users.where('email').equals(normalizedEmail).first();

      if (!existingUser) {
        toast({
          title: "Login Failed",
          description: "No account found with this email",
          variant: "destructive"
        });
        return false;
      }

      if (!verifyPassword(password, existingUser.passwordHash)) {
        toast({
          title: "Login Failed",
          description: "Incorrect password",
          variant: "destructive"
        });
        return false;
      }

      // Update last login
      await db.users.update(existingUser.id, { updatedAt: now() });

      // Save session
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: existingUser.id,
        email: existingUser.email
      }));

      setUser(existingUser);

      // Load settings
      const userSettings = await db.appSettings.where('userId').equals(existingUser.id).first();
      setSettings(userSettings || null);

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
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      const existingUser = await db.users.where('email').equals(normalizedEmail).first();
      if (existingUser) {
        toast({
          title: "Signup Failed",
          description: "An account with this email already exists",
          variant: "destructive"
        });
        return false;
      }

      // Create new user
      const userId = generateId();
      const newUser: User = {
        id: userId,
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        createdAt: now(),
        updatedAt: now()
      };

      await db.users.add(newUser);

      // Create default settings
      const defaultSettings: AppSettings = {
        id: generateId(),
        userId,
        profitPasswordSet: false,
        theme: 'light',
        currency: 'NGN',
        currencySymbol: '₦',
        createdAt: now(),
        updatedAt: now()
      };

      await db.appSettings.add(defaultSettings);

      // Save session
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: newUser.id,
        email: newUser.email
      }));

      setUser(newUser);
      setSettings(defaultSettings);

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
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSettings(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
  }, []);

  const hasProfitPassword = useCallback((): boolean => {
    return !!user?.profitPasswordHash;
  }, [user]);

  const setProfitPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const hash = hashPassword(password);
      await db.users.update(user.id, {
        profitPasswordHash: hash,
        updatedAt: now()
      });

      await db.appSettings.where('userId').equals(user.id).modify({
        profitPasswordSet: true,
        updatedAt: now()
      });

      setUser(prev => prev ? { ...prev, profitPasswordHash: hash } : null);
      setSettings(prev => prev ? { ...prev, profitPasswordSet: true } : null);

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
  }, [user]);

  const verifyProfitPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.profitPasswordHash) return false;
    return verifyPassword(password, user.profitPasswordHash);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
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
