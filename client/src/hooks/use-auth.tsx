import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authAPI, authStorage, type AuthUser } from "@/lib/supabase";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  login: (email: string) => Promise<{ success: boolean; message?: string }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicLink: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authAPI.signOut();
    setUser(null);
  };

  const sendMagicLink = async (email: string) => {
    return await authAPI.sendMagicLink(email);
  };

  const login = async (email: string) => {
    try {
      const result = await authAPI.login(email);
      if (result && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, message: "Login failed" };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: "Login failed" };
    }
  };

  const verifyMagicLink = async (token: string) => {
    try {
      const result = await authAPI.verifyMagicLink(token);
      if (result) {
        setUser(result.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Magic link verification failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signOut,
      login,
      sendMagicLink,
      verifyMagicLink,
    }}>
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
