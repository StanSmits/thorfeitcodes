import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
  requireAuth = true
}) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ec0000]"></div>
          <p className="text-sm text-gray-600">Toegang controleren...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Je moet ingelogd zijn om deze pagina te bekijken.</p>
        <p className="text-sm text-gray-500">
          Klik op "Inloggen" in de rechterbovenhoek om door te gaan.
        </p>
      </div>
    );
  }

  // If specific role is required but user doesn't have it
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Je hebt geen toegang tot deze pagina.</p>
        <p className="text-sm text-gray-500">
          Neem contact op met een administrator als je denkt dat dit een fout is.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};