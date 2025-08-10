// For this application, we use the backend API instead of direct database access
// This provides better security and allows for proper authentication middleware

// Auth types for Supabase-style authentication
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: string;
  locationAccess: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

// Simple JWT token management
const TOKEN_KEY = 'bepoz_auth_token';
const USER_KEY = 'bepoz_auth_user';

export const authStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  
  getUser: (): AuthUser | null => {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },
  
  setUser: (user: AuthUser): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

// Auth API functions
export const authAPI = {
  sendMagicLink: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }
      
      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send magic link' 
      };
    }
  },
  
  verifyMagicLink: async (token: string): Promise<{ user: AuthUser; accessToken: string } | null> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        throw new Error('Invalid or expired token');
      }
      
      const result = await response.json();
      authStorage.setToken(result.accessToken);
      authStorage.setUser(result.user);
      
      return result;
    } catch (error) {
      console.error('Magic link verification failed:', error);
      return null;
    }
  },
  
  signOut: async (): Promise<void> => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStorage.getToken()}`,
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      authStorage.removeToken();
    }
  },
  
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const token = authStorage.getToken();
    if (!token) return null;
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        authStorage.removeToken();
        return null;
      }
      
      const user = await response.json();
      authStorage.setUser(user);
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      authStorage.removeToken();
      return null;
    }
  },
};
