import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
  isAdmin: boolean;
  isModerator: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId);
      
      if (error) throw error;
      // Normalize DB enum values to UI role keys
      const mapped = (data || []).map((r: any) => {
        const role: string = r.role;
        if (role === 'administrator') return 'admin';
        if (role === 'subscriber') return 'user';
        return role; // 'moderator' or 'user' passthrough
      });

      setRoles(mapped || []);
    } catch (error) {
      
      setRoles([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session ?? null);

      if (session?.user) {
        // Try to read profile to obtain the canonical full_name and merge it into user_metadata
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileData && (profileData as any).full_name) {
            const mergedUser = {
              ...session.user,
              user_metadata: {
                ...(session.user.user_metadata ?? {}),
                full_name: (profileData as any).full_name,
              },
            } as User;
            setUser(mergedUser);
          } else {
            setUser(session.user);
          }
        } catch (err) {
          // If profile fetch fails, fall back to session user
          setUser(session.user);
        }

        await fetchUserRoles(session.user.id);
      } else {
        setUser(null);
        setRoles([]);
      }
    } catch (error) {
      
    }
  }, [fetchUserRoles]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Re-run our refresh logic on auth changes so profile and roles are in sync
        refreshUser();
      }
    );

    // Check for existing session and refresh user/profile
    refreshUser().finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRoles([]);
      toast({
        title: "Uitgelogd",
        description: "U bent succesvol uitgelogd.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het uitloggen.",
        variant: "destructive",
      });
    }
  };


  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator') || isAdmin;

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isModerator, signOut, refreshUser }}>
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