import { Link, useLocation } from 'react-router-dom';
import { Search, FileText, Book, Settings, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const { isModerator } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Zoeken', href: '/', icon: Search },
    { name: 'Favorieten', href: '/favorieten', icon: Star },
    { name: 'Opgeslagen', href: '/opgeslagen', icon: FileText },
    { name: 'Kennisbank', href: '/kennisbank', icon: Book },
    ...(isModerator ? [{ name: 'Beheer', href: '/admin', icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
