import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { AuthModal, UserMenu } from './auth';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui';

const Header: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center space-x-4 cursor-pointer"
              onClick={() => (window.location.href = '/')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  window.location.href = '/';
                }
              }}
            >
              <div className="ml-6">
                <a
                  href="/"
                  className="text-sm text-gray-700 hover:text-red-600 transition-colors duration-300 ml-2"
                  aria-label="Ga naar de homepage"
                >
                  Home
                </a>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="flex items-center space-x-3">
              {!isInitialized || isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ec0000]"></div>
                  <span className="text-xs text-gray-600">Laden...</span>
                </div>
              ) : isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => openAuthModal('signin')}
                    icon={LogIn}
                    className="text-sm px-3 py-1.5"
                  >
                    <span className="hidden sm:inline">Inloggen</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default Header;