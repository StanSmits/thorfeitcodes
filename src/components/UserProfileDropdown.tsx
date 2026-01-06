import { User, Settings, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from "react";
import { useAppSettings } from '@/hooks/useAppSettings';

export function UserProfileDropdown() {
  const { user, roles, signOut } = useAuth();
  const { isSubscriptionEnabled } = useAppSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getUserInitials = () => {
    const fullName = user?.user_metadata?.full_name || user?.email || "";
    if (!fullName) return "U";

    const names = fullName.split(" ").filter((n) => n.length > 0);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email || "Gebruiker";
  };

  const getUserRole = () => {
    if (roles.includes("admin")) return "Beheerder";
    if (roles.includes("moderator")) return "Moderator";
    return "Gebruiker";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-sm font-medium leading-none">
                {getUserName()}
              </p>
              {(() => {
                const role = getUserRole();
                const classes =
                  role === "Beheerder"
                    ? "bg-destructive text-destructive-foreground"
                    : role === "Moderator"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground";
                return (
                  <div className={`px-2 py-1 text-xs font-medium ${classes} rounded-md w-fit`}>
                    {role}
                  </div>
                );
              })()}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Instellingen</span>
        </DropdownMenuItem>
        {isSubscriptionEnabled && (
          <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Abonnement</span>
            <span className="ml-auto text-xs text-muted-foreground">Bekijk</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Uitloggen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
