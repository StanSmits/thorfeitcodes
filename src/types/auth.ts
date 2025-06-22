export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'subscriber' | 'moderator' | 'administrator';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
}