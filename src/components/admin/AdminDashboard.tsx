import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, Shield, Activity, Search, RefreshCw, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format, isAfter, subHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MaintenancePasswordSettings } from './MaintenancePasswordSettings';
import { AppSettingsManagement } from './AppSettingsManagement';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface UserStats {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  today_usage: number;
  last_sign_in: string | null;
  created_at: string;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [syncingStripe, setSyncingStripe] = useState(false);

  const handleSyncStripeCustomers = async () => {
    setSyncingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-customers');
      
      if (error) {
        throw error;
      }

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Sync voltooid met ${data.errors.length} fouten`, {
          description: `${data.updated} van ${data.total} klanten bijgewerkt.`,
        });
        console.error('Sync errors:', data.errors);
      } else {
        toast.success('Stripe klanten gesynchroniseerd', {
          description: `${data.updated} klanten bijgewerkt met naam en land.`,
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Synchronisatie mislukt', {
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    } finally {
      setSyncingStripe(false);
    }
  };

  const fetchUserStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError('Niet ingelogd');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-admin-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user stats');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het ophalen van de gegevens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate summary stats
  const totalUsers = users.length;
  const activeSubscribers = users.filter(u => 
    (u.subscription_status === 'active' || u.subscription_status === 'trialing') &&
    u.role !== 'admin' && u.role !== 'moderator'
  ).length;
  const staffCount = users.filter(u => u.role === 'admin' || u.role === 'moderator').length;
  
  // Count users who logged in within the last 24 hours
  const twentyFourHoursAgo = subHours(new Date(), 24);
  const activeLast24h = users.filter(u => 
    u.last_sign_in && isAfter(new Date(u.last_sign_in), twentyFourHoursAgo)
  ).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Beheerder</Badge>;
      case 'moderator':
        return <Badge className="bg-primary">Moderator</Badge>;
      default:
        return <Badge variant="secondary">Gebruiker</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string | null, plan: string | null, role: string, expiresAt: string | null) => {
    // Staff members show staff badge instead of subscription
    if (role === 'admin' || role === 'moderator') {
      return (
        <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Staff
        </Badge>
      );
    }
    
    const badge = (() => {
      if (status === 'active' || status === 'trialing') {
        return (
          <Badge className="bg-green-500 text-white flex items-center gap-1 cursor-help">
            <Crown className="h-3 w-3" />
            {plan === 'yearly' ? 'Jaarlijks' : plan === 'monthly' ? 'Maandelijks' : 'Pro'}
          </Badge>
        );
      }
      if (status === 'canceled' || status === 'cancelled') {
        return <Badge variant="outline" className="text-orange-500 border-orange-500 cursor-help">Opgezegd</Badge>;
      }
      if (status === 'past_due') {
        return <Badge variant="destructive" className="cursor-help">Achterstallig</Badge>;
      }
      return <Badge variant="outline">Gratis</Badge>;
    })();

    // Add tooltip for subscribers with expiration date
    if (expiresAt && (status === 'active' || status === 'trialing' || status === 'canceled' || status === 'cancelled')) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{badge}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="z-[100]">
            <p>
              {status === 'canceled' || status === 'cancelled' 
                ? `Loopt af op: ${format(new Date(expiresAt), 'd MMMM yyyy', { locale: nl })}`
                : `Verlenging: ${format(new Date(expiresAt), 'd MMMM yyyy', { locale: nl })}`
              }
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return badge;
  };

  const getUsageBadge = (usage: number, role: string, subscriptionStatus: string | null) => {
    // Staff and active subscribers show infinity
    if (role === 'admin' || role === 'moderator' || subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      return <Badge variant="outline" className="text-primary">∞</Badge>;
    }
    if (usage >= 5) {
      return <Badge variant="destructive">{usage}/5</Badge>;
    }
    if (usage >= 3) {
      return <Badge className="bg-orange-500">{usage}/5</Badge>;
    }
    return <Badge variant="secondary">{usage}/5</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-center">{error}</p>
          <Button onClick={fetchUserStats} className="mx-auto mt-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gebruikers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Abonnees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">{activeSubscribers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{staffCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Actief vandaag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{activeLast24h}</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Gebruikersoverzicht</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Bekijk abonnementsstatus en dagelijks gebruik
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchUserStats} className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="rounded-md border overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Gebruiker</TableHead>
                  <TableHead className="hidden sm:table-cell">Rol</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Gebruik</TableHead>
                  <TableHead className="hidden lg:table-cell">Laatst actief</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'Geen gebruikers gevonden' : 'Geen gebruikers'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{user.full_name || 'Onbekend'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-1 mt-1 sm:hidden">
                            {getRoleBadge(user.role)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {getSubscriptionBadge(user.subscription_status, user.subscription_plan, user.role, user.subscription_expires_at)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getUsageBadge(user.today_usage, user.role, user.subscription_status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {user.last_sign_in 
                          ? formatDistanceToNow(new Date(user.last_sign_in), { addSuffix: true, locale: nl })
                          : 'Nooit'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Stripe Klanten Synchronisatie
          </CardTitle>
          <CardDescription>
            Update alle bestaande Stripe klanten met naam en Nederland als land voor facturatie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSyncStripeCustomers} 
            disabled={syncingStripe}
            className="flex items-center gap-2"
          >
            {syncingStripe ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synchroniseren...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Synchroniseer Stripe Klanten
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* App Settings Management */}
      <AppSettingsManagement />

      {/* Maintenance Password Settings */}
      <MaintenancePasswordSettings />
    </div>
    </TooltipProvider>
  );
}
