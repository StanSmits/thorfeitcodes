import { ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

interface FeatureGateProps {
  feature: keyof (typeof defaultFeatures);
  children?: ReactNode;
  fallback?: ReactNode;
  hide?: boolean;
}

const defaultFeatures = {
  subscription_enabled: false,
} as const;

export function FeatureGate({
  feature,
  children,
  fallback = null,
  hide = true,
}: FeatureGateProps) {
  const { settings } = useAppSettings();

  const isEnabled = settings[feature] ?? defaultFeatures[feature as keyof typeof defaultFeatures] ?? false;

  if (!isEnabled) {
    return hide ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}
