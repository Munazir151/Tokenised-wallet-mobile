import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { getUserProfile, getOrCreateUserProfile } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUserData: (data: any) => void;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserData(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      let profile = await getUserProfile(userId);
      
      // If profile doesn't exist, create one from auth user data
      if (!profile && user) {
        const email = user.email || '';
        const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0];
        profile = await getOrCreateUserProfile(userId, email, name);
      }
      
      setUserData(profile);
    } catch (error: any) {
      console.log('Error loading profile:', error.message);
    }
    setIsLoading(false);
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userData,
        isLoading,
        isAuthenticated: !!session,
        setUserData,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
