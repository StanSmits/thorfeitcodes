import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, User } from 'lucide-react';

export function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Use the `profiles` table only. The `role` column on profiles is a single
      // enum (user_role) so we convert it to a roles array for compatibility with
      // the existing UI which renders multiple badges.
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      const normalizeDbToUi = (dbRole: string) => {
        if (!dbRole) return 'user';
        if (dbRole === 'administrator') return 'admin';
        if (dbRole === 'subscriber') return 'user';
        return dbRole; // moderator or user
      };

      const usersWithRoles = (profilesData || []).map((p: any) => ({
        ...p,
        roles: p.role ? [normalizeDbToUi(p.role)] : [],
      }));

      return usersWithRoles;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'user' }) => {
      // Map UI role to DB enum value
      const normalizeUiToDb = (uiRole: string) => {
        if (uiRole === 'admin') return 'administrator';
        if (uiRole === 'user') return 'user';
        if (uiRole === 'moderator') return 'moderator';
        return uiRole;
      };

      const dbRole = normalizeUiToDb(role);

      const { error } = await supabase
        .from('profiles')
        .update({ role: dbRole as any, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Rol bijgewerkt',
        description: 'De rol van de gebruiker is bijgewerkt.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fout',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'moderator':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const handleRoleChange = (userId: string, currentRoles: string[], newRole: 'admin' | 'moderator' | 'user') => {
    const currentRole = currentRoles && currentRoles.length > 0 ? currentRoles[0] : 'user';
    if (currentRole === newRole) return;
    // Update the single role column on profiles
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Gebruikers beheren</h2>

      <Card>
        <CardHeader>
          <CardTitle>Alle gebruikers</CardTitle>
          <CardDescription>
            Overzicht van alle gebruikers en hun rollen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rollen</TableHead>
                  <TableHead>Rol wijzigen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => {
                  const primaryRole = user.roles.includes('admin')
                    ? 'admin'
                    : user.roles.includes('moderator')
                    ? 'moderator'
                    : 'user';

                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || 'Onbekend'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="gap-1">
                              {getRoleIcon(role)}
                              {role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'Gebruiker'}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <Badge variant="secondary" className="gap-1">
                              {getRoleIcon('user')}
                              Gebruiker
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={primaryRole}
                          onValueChange={(value) => handleRoleChange(user.id, user.roles, value as 'admin' | 'moderator' | 'user')}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}