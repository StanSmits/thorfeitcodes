import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Search, Book, FileText, Settings, Star } from 'lucide-react';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';
import { MobileBottomNav } from '@/components/MobileBottomNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isModerator } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Zoeken', href: '/', icon: Search },
    { name: 'Favorieten', href: '/favorieten', icon: Star },
    { name: 'Opgeslagen', href: '/opgeslagen', icon: FileText },
    { name: 'Kennisbank', href: '/kennisbank', icon: Book },
  ];

  if (isModerator) {
    navigation.push({ name: 'Beheer', href: '/admin', icon: Settings });
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">Feitcodes</h1>
              <p className="text-xs text-muted-foreground">RVW Generator</p>
            </div>
          </Link>

          <nav className="hidden lg:flex lg:gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <UserProfileDropdown />
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-6">
        {children}
      </main>

      {/* Footer - hidden on mobile due to bottom nav */}
      <footer className="hidden lg:block border-t bg-card">
        <div className="container px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Feitcodes Applicatie. Alleen voor geautoriseerd personeel.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}