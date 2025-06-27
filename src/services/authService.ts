import { supabase } from '../config/supabase';
import { User } from '../types/auth';

export class AuthService {
  private static instance: AuthService;
  private profileCache = new Map<string, { user: User; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async fetchUserProfile(userId: string, useCache = true): Promise<User | null> {
    // Check cache first
    if (useCache) {
      const cached = this.profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.user;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, return null
          return null;
        }
        throw error;
      }

      if (data) {
        // Cache the result
        this.profileCache.set(userId, {
          user: data,
          timestamp: Date.now()
        });
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let message = 'Er is een fout opgetreden bij het inloggen.';
        
        if (error.message.includes('Invalid login credentials')) {
          message = 'Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord.';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'E-mailadres is nog niet bevestigd. Controleer je inbox.';
        } else if (error.message.includes('Too many requests')) {
          message = 'Te veel inlogpogingen. Probeer het later opnieuw.';
        }
        
        return { user: null, error: message };
      }

      if (!data.user) {
        return { user: null, error: 'Geen gebruikersgegevens ontvangen.' };
      }

      // Fetch user profile
      const profile = await this.fetchUserProfile(data.user.id, false);
      
      if (!profile) {
        // Create basic profile if none exists
        const basicUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || '',
          role: 'user',
          subscription_status: 'inactive',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return { user: basicUser, error: null };
      }

      return { user: profile, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Onbekende fout bij inloggen.' 
      };
    }
  }

  async signUp(email: string, password: string, fullName?: string): Promise<{ user: User | null; error: string | null }> {
    try {
      if (password.length < 6) {
        return { user: null, error: 'Wachtwoord moet minimaal 6 karakters lang zijn.' };
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
        let message = 'Er is een fout opgetreden bij het registreren.';
        
        if (error.message.includes('User already registered')) {
          message = 'Dit e-mailadres is al geregistreerd. Probeer in te loggen.';
        } else if (error.message.includes('Password should be at least')) {
          message = 'Wachtwoord moet minimaal 6 karakters lang zijn.';
        } else if (error.message.includes('Unable to validate email address')) {
          message = 'Ongeldig e-mailadres. Controleer je invoer.';
        }
        
        return { user: null, error: message };
      }

      if (!data.user) {
        return { user: null, error: 'Geen gebruikersgegevens ontvangen.' };
      }

      // If user is immediately signed in (no email confirmation)
      if (data.session) {
        // Wait a bit for profile creation trigger
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const profile = await this.fetchUserProfile(data.user.id, false);
        
        if (!profile) {
          // Create basic profile if trigger failed
          const basicUser: User = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName || '',
            role: 'user',
            subscription_status: 'inactive',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return { user: basicUser, error: null };
        }

        return { user: profile, error: null };
      }

      // Email confirmation required
      return { user: null, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Onbekende fout bij registreren.' 
      };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      // Clear cache
      this.profileCache.clear();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het uitloggen.' 
      };
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<{ error: string | null }> {
    try {
      // Clear cache for this user
      this.profileCache.delete(userId);
      
      const { error } = await supabase.auth.updateUser({
        data: updates,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het bijwerken van het profiel.' 
      };
    }
  }

  async changePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      if (newPassword.length < 6) {
        return { error: 'Wachtwoord moet minimaal 6 karakters lang zijn.' };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Change password error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.' 
      };
    }
  }

  async subscribe(userId: string, plan: string): Promise<{ error: string | null }> {
    try {
      // Clear cache for this user
      this.profileCache.delete(userId);
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const updates = {
        subscription_status: 'active' as const,
        subscription_plan: plan,
        subscription_expires_at: expiresAt.toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Subscribe error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het activeren van het abonnement.' 
      };
    }
  }

  async cancelSubscription(userId: string): Promise<{ error: string | null }> {
    try {
      // Clear cache for this user
      this.profileCache.delete(userId);
      
      const updates = {
        subscription_status: 'cancelled' as const,
        subscription_plan: null,
        subscription_expires_at: null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden bij het annuleren van het abonnement.' 
      };
    }
  }

  clearCache(): void {
    this.profileCache.clear();
  }
}

export const authService = AuthService.getInstance();