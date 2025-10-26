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
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (usersError) throw usersError;

      const usersWithRoles = await Promise.all(
        usersData.map(async (user) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          return {
            ...user,
            roles: rolesData?.map((r) => r.role) || [],
          };
        })
      );

      return usersWithRoles;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: 'admin' | 'moderator' | 'user'; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: role as any }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as any);
        if (error) throw error;
      }
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
    if (newRole === 'user') {
      // Remove all roles
      currentRoles.forEach((role) => {
        if (role !== 'user') {
          updateRoleMutation.mutate({ userId, role: role as 'admin' | 'moderator' | 'user', action: 'remove' });
        }
      });
    } else if (!currentRoles.includes(newRole)) {
      updateRoleMutation.mutate({ userId, role: newRole, action: 'add' });
    }
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