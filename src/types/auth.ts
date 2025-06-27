export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  subscription_plan?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  last_sign_in?: string;
}

export type UserRole = 'user' | 'subscriber' | 'moderator' | 'administrator';
export type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'expired';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  subscribe: (plan: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSubscriber: boolean;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}