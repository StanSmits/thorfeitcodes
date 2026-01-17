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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { 
  Pencil, 
  Shield, 
  ShieldCheck, 
  User, 
  MoreHorizontal, 
  Mail, 
  KeyRound,
  Trash2,
  Clock,
  Calendar,
  Heart
} from "lucide-react";
import { toastSuccess, toastError, toastEmailSent, toastDeleted } from "@/components/ui/sonner";
import { SkeletonTable } from "../ui/SkeletonCard";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name_asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch from get-admin-stats edge function which gets subscription data from Stripe
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Not authenticated");
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
        throw new Error(errorData.error || 'Failed to fetch admin stats');
      }

      const data = await response.json();
      
      const normalizeDbToUi = (dbRole: string) => {
        if (!dbRole) return "user";
        if (dbRole === "administrator") return "admin";
        if (dbRole === "subscriber") return "user";
        return dbRole;
      };

      const usersWithRoles = (data.users || []).map((u: any) => ({
        id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in,
        subscription_status: u.subscription_status,
        subscription_plan: u.subscription_plan,
        subscription_expires_at: u.subscription_expires_at,
        has_donated: u.has_donated === true,
        roles: u.role ? [normalizeDbToUi(u.role)] : [],
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
      toastSuccess("Rol bijgewerkt");
    },
    onError: (error: any) => {
      toastError("Fout", error.message);
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "moderator":
        return "Moderator";
      default:
        return "Gebruiker";
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
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      // Use production domain for redirect
      const redirectUrl = window.location.hostname.includes('lovableproject.com') 
        ? 'https://rvw.stansmits.nl/auth?type=recovery'
        : `${window.location.origin}/auth?type=recovery`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toastEmailSent();
    } catch (error: any) {
      toastError("Fout", error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Use the hard_delete_user function
      const { error } = await supabase.rpc('hard_delete_user', { target_user: userId });
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toastDeleted("Gebruiker");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toastError("Fout", error.message);
    }
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
      toastSuccess("Gebruiker bijgewerkt");
      setEditOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toastError("Fout", error.message);
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
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Gebruikers beheren</h2>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Alle gebruikers</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Overzicht van alle gebruikers en hun rollen
            </CardDescription>
            <div className="mt-3 sm:mt-4 flex flex-col gap-3">
              <Input
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle rollen</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">Gebruiker</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Sorteren" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Naam A-Z</SelectItem>
                    <SelectItem value="name_desc">Naam Z-A</SelectItem>
                    <SelectItem value="created_desc">Nieuw → Oud</SelectItem>
                    <SelectItem value="created_asc">Oud → Nieuw</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {isLoading ? (
              <SkeletonTable />
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Gebruiker</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="w-[50px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => {
                      const primaryRole = user.roles.includes("admin")
                        ? "admin"
                        : user.roles.includes("moderator")
                        ? "moderator"
                        : "user";

                      const hasSubscription = user.subscription_status === 'active';
                      const lastSignIn = user.last_sign_in 
                        ? formatDistanceToNow(new Date(user.last_sign_in), { addSuffix: true, locale: nl })
                        : null;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate text-sm">{user.full_name || "Onbekend"}</span>
                              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {user.has_donated && (
                                  <Badge variant="outline" className="text-xs bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 border-pink-300 dark:border-pink-700">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Donateur
                                  </Badge>
                                )}
                                {hasSubscription ? (
                                  <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">Pro</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Gratis</Badge>
                                )}
                              </div>
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
                              <SelectTrigger className="w-[140px]">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon(primaryRole)}
                                  <span>{getRoleLabel(primaryRole)}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Gebruiker</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="moderator">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Moderator</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    <span>Admin</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Acties</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditFor(user)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Bewerken
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendPasswordReset(user.email)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Wachtwoord reset
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(user.email);
                                  toastSuccess("E-mail gekopieerd");
                                }}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Kopieer e-mail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Verwijderen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

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
                            <SelectTrigger className="w-full">
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

                {/* Delete confirmation dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Gebruiker verwijderen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je <strong>{userToDelete?.full_name || userToDelete?.email}</strong> permanent wilt verwijderen? 
                        Deze actie kan niet ongedaan worden gemaakt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
                      >
                        Verwijderen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
