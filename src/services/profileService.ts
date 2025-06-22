import { supabase } from '../config/supabase';
import { User, UserRole } from '../types/auth';

class ProfileService {
  async fetchUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  }

  async fetchAllProfiles(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteUserProfile(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
}

export const profileService = new ProfileService();