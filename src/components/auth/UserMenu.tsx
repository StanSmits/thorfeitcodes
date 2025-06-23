import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Shield, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut, isAdmin, isModerator, isSubscriber } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
      navigate('/');
    } catch (error) {
      // Error handling is done in the auth context
    }
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      user: 'Gebruiker',
      subscriber: 'Abonnee',
      moderator: 'Moderator',
      administrator: 'Administrator'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap = {
      user: 'bg-gray-100 text-gray-800',
      subscriber: 'bg-blue-100 text-blue-800',
      moderator: 'bg-yellow-100 text-yellow-800',
      administrator: 'bg-red-100 text-red-800'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-[#ec0000] transition-colors duration-300 p-2 rounded-md hover:bg-gray-100"
        aria-label="Gebruikersmenu"
      >
        <div className="w-8 h-8 bg-[#ec0000] text-white rounded-full flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium hidden md:block">
          {user.full_name || user.email.split('@')[0]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#ec0000] text-white rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || 'Gebruiker'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {(isAdmin || isModerator) && <Shield className="w-3 h-3 mr-1" />}
                    {getRoleDisplay(user.role)}
                  </span>
                  {isSubscriber && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => handleNavigation('/profile')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              Profiel instellingen
            </button>

            {(isAdmin || isModerator) && (
              <button
                onClick={() => handleNavigation('/admin')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Shield className="w-4 h-4 mr-3" />
                Admin Panel
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Uitloggen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};