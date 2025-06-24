import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../config/supabase';
import { User, AuthContextType, UserRole } from '../types/auth';
import { useToast } from '../hooks/useToast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Maximum loading time before forcing completion
const MAX_LOADING_TIME = 3000; // 3 seconds
const PROFILE_FETCH_TIMEOUT = 2000; // 2 seconds for profile fetch

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { showSuccess, showError } = useToast();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'administrator';
  const isModerator = user?.role === 'moderator' || user?.role === 'administrator';
  const isSubscriber = user?.subscription_status === 'active' || user?.role === 'subscriber';

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  // Force loading to complete after maximum time
  const setLoadingWithTimeout = (loading: boolean) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (loading && !isInitialized) {
      setIsLoading(true);
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('Auth loading timeout reached, forcing completion');
          setIsLoading(false);
          setIsInitialized(true);
        }
      }, MAX_LOADING_TIME);
    } else {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('Profile fetch timeout reached');
        resolve(null);
      }, PROFILE_FETCH_TIMEOUT);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        clearTimeout(timeoutId);

        if (error) {
          console.error('Error fetching user profile:', error);
          resolve(null);
          return;
        }
        
        resolve(data);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error fetching user profile:', error);
        resolve(null);
      }
    });
  };

  const refreshUser = async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const profile = await fetchUserProfile(user.id);
      if (profile && mountedRef.current) {
        setUser(profile);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoadingWithTimeout(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('E-mailadres is nog niet bevestigd. Controleer je inbox.');
        }
        throw new Error(error.message);
      }

      if (data.user && mountedRef.current) {
        // Wait a moment for the profile to be created if it's a new user
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const profile = await fetchUserProfile(data.user.id);
        if (profile && mountedRef.current) {
          setUser(profile);
          showSuccess('Succesvol ingelogd!');
        } else if (mountedRef.current) {
          // Create a basic user object if profile fetch fails
          const basicUser: User = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || '',
            role: 'user',
            subscription_status: 'inactive',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUser(basicUser);
          showSuccess('Succesvol ingelogd!');
          console.warn('Using basic user profile due to fetch failure');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het inloggen.';
      showError(message);
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<void> => {
    try {
      setLoadingWithTimeout(true);
      
      if (password.length < 6) {
        throw new Error('Wachtwoord moet minimaal 6 karakters lang zijn.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Dit e-mailadres is al geregistreerd. Probeer in te loggen.');
        }
        if (error.message.includes('Password should be at least')) {
          throw new Error('Wachtwoord moet minimaal 6 karakters lang zijn.');
        }
        if (error.message.includes('Unable to validate email address')) {
          throw new Error('Ongeldig e-mailadres. Controleer je invoer.');
        }
        throw new Error(error.message);
      }

      if (data.user && mountedRef.current) {
        // For immediate signup without email confirmation
        if (data.session) {
          // User is immediately signed in
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for profile creation
          const profile = await fetchUserProfile(data.user.id);
          if (profile && mountedRef.current) {
            setUser(profile);
            showSuccess('Account succesvol aangemaakt en ingelogd!');
          } else if (mountedRef.current) {
            // Create basic user if profile fetch fails
            const basicUser: User = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: fullName || '',
              role: 'user',
              subscription_status: 'inactive',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setUser(basicUser);
            showSuccess('Account succesvol aangemaakt en ingelogd!');
          }
        } else {
          // Email confirmation required
          showSuccess('Account succesvol aangemaakt! Controleer je e-mail voor bevestiging.');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het registreren.';
      showError(message);
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false);
      }
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      if (mountedRef.current) {
        setUser(null);
        showSuccess('Succesvol uitgelogd!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het uitloggen.';
      showError(message);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) throw new Error('Geen gebruiker ingelogd');

    try {
      setLoadingWithTimeout(true);
      // Only update the auth user metadata, not the profiles table directly
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });
      if (error) throw error;
      // The profile will be updated via a Supabase trigger, so just show success
      showSuccess('Profiel succesvol bijgewerkt!');
      // Fetch the updated profile from the database
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile && mountedRef.current) {
        setUser(updatedProfile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het bijwerken van het profiel.';
      showError(message);
      throw error;
    }
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    try {
      if (newPassword.length < 6) {
        throw new Error('Wachtwoord moet minimaal 6 karakters lang zijn.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showSuccess('Wachtwoord succesvol gewijzigd!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.';
      showError(message);
      throw error;
    }
  };

  const subscribe = async (plan: string): Promise<void> => {
    if (!user) throw new Error('Geen gebruiker ingelogd');

    try {
      // TODO: Integrate with Stripe for actual payment processing
      // For now, we'll simulate the subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 1 month

      const updates = {
        subscription_status: 'active' as const,
        subscription_plan: plan,
        subscription_expires_at: expiresAt.toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      if (mountedRef.current) {
        setUser({ ...user, ...updates });
        showSuccess('Abonnement succesvol geactiveerd!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het activeren van het abonnement.';
      showError(message);
      throw error;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!user) throw new Error('Geen gebruiker ingelogd');

    try {
      const updates = {
        subscription_status: 'cancelled' as const,
        subscription_plan: null,
        subscription_expires_at: null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      if (mountedRef.current) {
        setUser({ ...user, ...updates });
        showSuccess('Abonnement succesvol geannuleerd!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het annuleren van het abonnement.';
      showError(message);
      throw error;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        setLoadingWithTimeout(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        if (session?.user && mountedRef.current) {
          const profile = await fetchUserProfile(session.user.id);
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
      } finally {
        if (mountedRef.current) {
          setLoadingWithTimeout(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('Auth state changed:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
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
          }
        } else if (event === 'SIGNED_OUT') {
          if (mountedRef.current) {
            setUser(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Ensure user profile is still loaded after token refresh
          if (!user && mountedRef.current) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile && mountedRef.current) {
              setUser(profile);
            }
          }
        }
      }
    );

    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Emergency timeout to prevent infinite loading
  useEffect(() => {
    if (!isInitialized) {
      const emergencyTimeout = setTimeout(() => {
        if (mountedRef.current && !isInitialized) {
          console.warn('Emergency timeout: forcing auth initialization completion');
          setIsLoading(false);
          setIsInitialized(true);
        }
      }, MAX_LOADING_TIME);

      return () => clearTimeout(emergencyTimeout);
    }
  }, [isInitialized]);

  const value: AuthContextType = {
    user,
    isLoading: isLoading && !isInitialized,
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