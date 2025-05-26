import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useToast } from './useToast';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showSuccess('Successfully logged in');
      navigate('/admin');
    } catch (error) {
      showError('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      showSuccess('Successfully logged out');
      navigate('/login');
    } catch (error) {
      showError('Logout failed');
      console.error('Logout error:', error);
    }
  };

  return {
    isLoading,
    isAuthenticated,
    login,
    logout,
  };
};