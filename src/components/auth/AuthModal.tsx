import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, isLoading, error, clearError } = useAuth();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setShowPassword(false);
    setIsSubmitting(false);
    clearError();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;
    
    setIsSubmitting(true);
    clearError();

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        handleClose();
      } else {
        await signUp(email, password, fullName);
        // For signup, we might want to keep the modal open to show success message
        // or close it if the user is immediately signed in
        resetForm();
        handleClose();
      }
    } catch (error) {
      // Error handling is done in the auth context
      console.error('Auth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    clearError();
  };

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isFormValid = email.trim() && password.length >= 6;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec0000] focus:ring-offset-2 rounded"
          aria-label="Sluiten"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {mode === 'signin' ? 'Inloggen' : 'Registreren'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Volledige naam (optioneel)"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Voer je volledige naam in"
                disabled={isSubmitting}
              />
            )}

            <Input
              label="E-mailadres"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voornaam@voorbeeld.nl"
              required
              disabled={isSubmitting}
            />

            <div className="relative">
              <Input
                label="Wachtwoord"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Voer je wachtwoord in"
                required
                className="pr-10"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ec0000] focus:ring-offset-2 rounded"
                aria-label={
                  showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'
                }
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {mode === 'signup' && (
              <p className="text-xs text-gray-600">
                Wachtwoord moet minimaal 6 karakters lang zijn.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
            >
              {mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'signin' ? 'Nog geen account?' : 'Al een account?'}
              <button
                onClick={switchMode}
                className="ml-1 text-[#ec0000] hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-[#ec0000] focus:ring-offset-2 rounded"
                disabled={isSubmitting}
              >
                {mode === 'signin' ? 'Registreer hier' : 'Log hier in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};