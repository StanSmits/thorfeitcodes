import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { User, AuthContextType, UserRole, AuthState } from '../types/auth';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const INITIAL_STATE: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,
  error: null,
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const { showSuccess, showError } = useToast();
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);

  // Derived state
  const isAuthenticated = !!state.user;
  const isAdmin = state.user?.role === 'administrator';
  const isModerator = state.user?.role === 'moderator' || state.user?.role === 'administrator';
  const isSubscriber = state.user?.subscription_status === 'active' || state.user?.role === 'subscriber';

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role);
  }, [state.user]);

  const updateState = useCallback((updates: Partial<AuthState>) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setUser = useCallback((user: User | null) => {
    updateState({ user, isAuthenticated: !!user });
  }, [updateState]);

  const setLoading = useCallback((isLoading: boolean) => {
    updateState({ isLoading });
  }, [updateState]);

  const setError = useCallback((error: string | null) => {
    updateState({ error });
  }, [updateState]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!state.user?.id) return;
    
    try {
      const profile = await authService.fetchUserProfile(state.user.id, false);
      if (profile && mountedRef.current) {
        setUser(profile);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [state.user?.id, setUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const { user, error } = await authService.signIn(email, password);
      
      if (error) {
        setError(error);
        showError(error);
        throw new Error(error);
      }
      
      if (user && mountedRef.current) {
        setUser(user);
        showSuccess('Succesvol ingelogd!');
      }
    } catch (error) {
      // Error already handled above
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [setLoading, setError, setUser, showSuccess, showError]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const { user, error } = await authService.signUp(email, password, fullName);
      
      if (error) {
        setError(error);
        showError(error);
        throw new Error(error);
      }
      
      if (user && mountedRef.current) {
        setUser(user);
        showSuccess('Account succesvol aangemaakt en ingelogd!');
      } else if (mountedRef.current) {
        showSuccess('Account succesvol aangemaakt! Controleer je e-mail voor bevestiging.');
      }
    } catch (error) {
      // Error already handled above
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [setLoading, setError, setUser, showSuccess, showError]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      const { error } = await authService.signOut();
      
      if (error) {
        showError(error);
        throw new Error(error);
      }
      
      if (mountedRef.current) {
        setUser(null);
        showSuccess('Succesvol uitgelogd!');
      }
    } catch (error) {
      // Error already handled above
      throw error;
    }
  }, [setUser, showSuccess, showError]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!state.user) throw new Error('Geen gebruiker ingelogd');

    setLoading(true);
    try {
      const { error } = await authService.updateProfile(state.user.id, updates);
      
      if (error) {
        showError(error);
        throw new Error(error);
      }
      
      showSuccess('Profiel succesvol bijgewerkt!');
      await refreshUser();
    } catch (error) {
      // Error already handled above
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [state.user, setLoading, refreshUser, showSuccess, showError]);

  const changePassword = useCallback(async (newPassword: string): Promise<void> => {
    try {
      const { error } = await authService.changePassword(newPassword);
      
      if (error) {
        showError(error);
        throw new Error(error);
      }
      
      showSuccess('Wachtwoord succesvol gewijzigd!');
    } catch (error) {
      // Error already handled above
      throw error;
    }
  }, [showSuccess, showError]);

  const subscribe = useCallback(async (plan: string): Promise<void> => {
    if (!state.user) throw new Error('Geen gebruiker ingelogd');

    setLoading(true);
    try {
      const { error } = await authService.subscribe(state.user.id, plan);
      
      if (error) {
        showError(error);
        throw new Error(error);
      }
      
      showSuccess('Abonnement succesvol geactiveerd!');
      await refreshUser();
    } catch (error) {
      // Error already handled above
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [state.user, setLoading, refreshUser, showSuccess, showError]);

  const cancelSubscription = useCallback(async (): Promise<void> => {
    if (!state.user) throw new Error('Geen gebruiker ingelogd');

    setLoading(true);
    try {
      const { error } = await authService.cancelSubscription(state.user.id);
      
      if (error) {
        showError(error);
        throw new Error(error);
      }
      
      showSuccess('Abonnement succesvol geannuleerd!');
      await refreshUser();
    } catch (error) {
      // Error already handled above
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [state.user, setLoading, refreshUser, showSuccess, showError]);

  // Initialize authentication
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        const session = await authService.getCurrentSession();
        
        if (session?.user && mountedRef.current) {
          const profile = await authService.fetchUserProfile(session.user.id);
          
          if (profile && mountedRef.current) {
            setUser(profile);
          } else if (mountedRef.current) {
            // Create basic user if profile fetch fails
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || '',
              role: 'user',
              subscription_status: 'inactive',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setUser(basicUser);
            console.warn('Using basic user profile during initialization');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current) {
          setError('Fout bij het laden van authenticatie');
        }
      } finally {
        if (mountedRef.current) {
          updateState({ isLoading: false, isInitialized: true });
        }
      }
    };

    initializeAuth();
  }, [setLoading, setUser, setError, updateState]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('Auth state changed:', event, session?.user?.id);

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              const profile = await authService.fetchUserProfile(session.user.id);
              if (profile && mountedRef.current) {
                setUser(profile);
              } else if (mountedRef.current) {
                const basicUser: User = {
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name || '',
                  role: 'user',
                  subscription_status: 'inactive',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                setUser(basicUser);
              }
            }
            break;

          case 'SIGNED_OUT':
            if (mountedRef.current) {
              setUser(null);
              authService.clearCache();
            }
            break;

          case 'TOKEN_REFRESHED':
            // Ensure user profile is still loaded after token refresh
            if (session?.user && !state.user && mountedRef.current) {
              const profile = await authService.fetchUserProfile(session.user.id);
              if (profile && mountedRef.current) {
                setUser(profile);
              }
            }
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, state.user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const value: AuthContextType = {
    ...state,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
    subscribe,
    cancelSubscription,
    hasRole,
    isAdmin,
    isModerator,
    isSubscriber,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
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