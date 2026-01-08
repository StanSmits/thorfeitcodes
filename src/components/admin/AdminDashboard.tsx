import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, Shield, Activity, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

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
  const activeToday = users.filter(u => u.today_usage > 0).length;

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

  const getSubscriptionBadge = (status: string | null, plan: string | null, role: string) => {
    // Staff members show staff badge instead of subscription
    if (role === 'admin' || role === 'moderator') {
      return (
        <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Staff
        </Badge>
      );
    }
    if (status === 'active' || status === 'trialing') {
      return (
        <Badge className="bg-green-500 text-white flex items-center gap-1">
          <Crown className="h-3 w-3" />
          {plan === 'yearly' ? 'Jaarlijks' : plan === 'monthly' ? 'Maandelijks' : 'Pro'}
        </Badge>
      );
    }
    if (status === 'canceled' || status === 'cancelled') {
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Opgezegd</Badge>;
    }
    if (status === 'past_due') {
      return <Badge variant="destructive">Achterstallig</Badge>;
    }
    return <Badge variant="outline">Gratis</Badge>;
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
            <p className="text-3xl font-bold text-green-500">{activeToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gebruikersoverzicht</CardTitle>
              <CardDescription>
                Bekijk abonnementsstatus en dagelijks gebruik van alle gebruikers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchUserStats}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gebruiker</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead>Gebruik vandaag</TableHead>
                  <TableHead>Laatst actief</TableHead>
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
                        <div>
                          <p className="font-medium">{user.full_name || 'Onbekend'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {getSubscriptionBadge(user.subscription_status, user.subscription_plan, user.role)}
                      </TableCell>
                      <TableCell>
                        {getUsageBadge(user.today_usage, user.role, user.subscription_status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
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
    </div>
  );
}
