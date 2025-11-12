import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, User } from "lucide-react";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name_asc");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Use the `profiles` table only. The `role` column on profiles is a single
      // enum (user_role) so we convert it to a roles array for compatibility with
      // the existing UI which renders multiple badges.
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const normalizeDbToUi = (dbRole: string) => {
        if (!dbRole) return "user";
        if (dbRole === "administrator") return "admin";
        if (dbRole === "subscriber") return "user";
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
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "moderator" | "user";
    }) => {
      // Map UI role to DB enum value
      const normalizeUiToDb = (uiRole: string) => {
        if (uiRole === "admin") return "administrator";
        if (uiRole === "user") return "user";
        if (uiRole === "moderator") return "moderator";
        return uiRole;
      };

      const dbRole = normalizeUiToDb(role);

      const { error } = await supabase
        .from("profiles")
        .update({ role: dbRole as any, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Rol bijgewerkt",
        description: "De rol van de gebruiker is bijgewerkt.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "moderator":
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const handleRoleChange = (
    userId: string,
    currentRoles: string[],
    newRole: "admin" | "moderator" | "user"
  ) => {
    const currentRole =
      currentRoles && currentRoles.length > 0 ? currentRoles[0] : "user";
    if (currentRole === newRole) return;
    // Update the single role column on profiles
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    role: "admin" | "moderator" | "user";
  }>({ full_name: "", role: "user" });

  const openEditFor = (user: any) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      role:
        user.roles && user.roles.includes("admin")
          ? "admin"
          : user.roles && user.roles.includes("moderator")
          ? "moderator"
          : "user",
    });
    setEditOpen(true);
  };

  const saveUserMutation = useMutation({
    mutationFn: async ({
      id,
      full_name,
      role,
    }: {
      id: string;
      full_name: string;
      role: string;
    }) => {
      const normalizeUiToDb = (uiRole: string) => {
        if (uiRole === "admin") return "administrator";
        if (uiRole === "user") return "user";
        if (uiRole === "moderator") return "moderator";
        return uiRole;
      };

      const dbRole = normalizeUiToDb(role);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name,
          role: dbRole as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Bijgewerkt",
        description: "Gebruiker succesvol bijgewerkt.",
      });
      setEditOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = useMemo(() => {
    const list = (users || []).filter((u: any) => {
      const search = String(searchQuery).toLowerCase();
      const matchesSearch =
        String(u.full_name || "")
          .toLowerCase()
          .includes(search) ||
        String(u.email || "")
          .toLowerCase()
          .includes(search);

      if (!matchesSearch) return false;
      if (roleFilter === "all") return true;
      // roleFilter values: 'admin' | 'moderator' | 'user'
      const primary = u.roles && u.roles.length > 0 ? u.roles[0] : "user";
      return primary === roleFilter;
    });

    const sorted = [...list];
    sorted.sort((a: any, b: any) => {
      switch (sortOption) {
        case "name_asc": {
          const av = String(a.full_name || "").toLowerCase();
          const bv = String(b.full_name || "").toLowerCase();
          return av.localeCompare(bv);
        }
        case "name_desc": {
          const av = String(a.full_name || "").toLowerCase();
          const bv = String(b.full_name || "").toLowerCase();
          return bv.localeCompare(av);
        }
        case "created_desc": {
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bd - ad;
        }
        case "created_asc": {
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ad - bd;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [users, searchQuery, roleFilter, sortOption]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Gebruikers beheren</h2>

      <Card>
        <CardHeader>
          <CardTitle>Alle gebruikers</CardTitle>
          <CardDescription>
            Overzicht van alle gebruikers en hun rollen
          </CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Zoek op naam of e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filter op rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle rollen</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">Gebruiker</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Sorteren op" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Naam A-Z</SelectItem>
                  <SelectItem value="name_desc">Naam Z-A</SelectItem>
                  <SelectItem value="created_desc">
                    Aangemaakt (nieuw → oud)
                  </SelectItem>
                  <SelectItem value="created_asc">
                    Aangemaakt (oud → nieuw)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Laden...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rollen</TableHead>
                    <TableHead>Rol wijzigen</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => {
                    const primaryRole = user.roles.includes("admin")
                      ? "admin"
                      : user.roles.includes("moderator")
                      ? "moderator"
                      : "user";

                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || "Onbekend"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className="gap-1"
                              >
                                {getRoleIcon(role)}
                                {role === "admin"
                                  ? "Admin"
                                  : role === "moderator"
                                  ? "Moderator"
                                  : "Gebruiker"}
                              </Badge>
                            ))}
                            {user.roles.length === 0 && (
                              <Badge variant="secondary" className="gap-1">
                                {getRoleIcon("user")}
                                Gebruiker
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={primaryRole}
                            onValueChange={(value) =>
                              handleRoleChange(
                                user.id,
                                user.roles,
                                value as "admin" | "moderator" | "user"
                              )
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Gebruiker</SelectItem>
                              <SelectItem value="moderator">
                                Moderator
                              </SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditFor(user)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Bewerken</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Edit user dialog */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gebruiker bewerken</DialogTitle>
                  </DialogHeader>
                  {editingUser && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveUserMutation.mutate({
                          id: editingUser.id,
                          full_name: editForm.full_name,
                          role: editForm.role,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label>Naam</Label>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              full_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Rol</Label>
                        <Select
                          value={editForm.role}
                          onValueChange={(v) =>
                            setEditForm((s) => ({ ...s, role: v as any }))
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Gebruiker</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={(saveUserMutation as any).isLoading}
                        >
                          Opslaan
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditOpen(false)}
                        >
                          Annuleren
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
