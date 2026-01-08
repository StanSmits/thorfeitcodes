import { User, Settings, CreditCard, LogOut, Crown, Sparkles, Infinity, Shield } from "lucide-react";
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
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Progress } from '@/components/ui/progress';

export function UserProfileDropdown() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { 
    isSubscriptionEnabled, 
    isSubscriber, 
    currentPlan,
    hasUnlimitedAccess,
  } = useSubscriptionAccess();
  const { remaining, dailyLimit, usagePercentage, isUnlimited, loading: rateLimitLoading } = useRateLimit();
  
  // Check if user is mod or admin
  const isModOrAdmin = roles.includes("admin") || roles.includes("moderator");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getUserInitials = () => {
    const fullName = user?.user_metadata?.full_name || user?.email || "";
    if (!fullName) return "U";

    const names = fullName.split(" ").filter((n: string) => n.length > 0);
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

  // usagePercentage now comes from useRateLimit hook

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
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-sm font-medium leading-none truncate max-w-[120px]">
                {getUserName()}
              </p>
              <div className="flex items-center gap-1">
                {isSubscriber && (
                  <div className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Pro
                  </div>
                )}
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
            </div>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        {/* Unlimited access indicator for mods/admins */}
        {isModOrAdmin && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="font-medium">Onbeperkt gebruik</span>
                </div>
                <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                  <Infinity className="h-3.5 w-3.5" />
                  <span>Staff</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Als {roles.includes("admin") ? "beheerder" : "moderator"} heb je onbeperkte toegang.
              </p>
            </div>
          </>
        )}

        {/* Usage indicator for free users when subscriptions are enabled */}
        {isSubscriptionEnabled && !hasUnlimitedAccess && !isModOrAdmin && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Dagelijks gebruik
                </span>
                <span className="font-medium">
                  {Math.max(0, dailyLimit - remaining)}/{dailyLimit}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {remaining > 0 
                  ? `Nog ${remaining} generatie${remaining !== 1 ? 's' : ''} over`
                  : 'Limiet bereikt - upgrade voor meer'
                }
              </p>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Instellingen</span>
        </DropdownMenuItem>
        {isSubscriptionEnabled && (
          <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Abonnement</span>
            {isSubscriber ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {currentPlan === 'yearly' ? 'Jaarlijks' : 'Maandelijks'}
              </span>
            ) : (
              <span className="ml-auto text-xs text-primary font-medium">Upgrade</span>
            )}
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
