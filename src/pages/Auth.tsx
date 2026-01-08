import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { invalidateSubscriptionCache, useSubscription } from "@/hooks/useSubscription";

// Validation schemas
const emailSchema = z
  .string()
  .trim()
  .min(1, "E-mailadres is verplicht")
  .email("Ongeldig e-mailadres")
  .max(255, "E-mailadres mag maximaal 255 karakters zijn")
  .refine(
    (email) => email.toLowerCase().endsWith("@amsterdam.nl"),
    "Alleen @amsterdam.nl e-mailadressen zijn toegestaan"
  );

const passwordSchema = z
  .string()
  .min(8, "Wachtwoord moet minimaal 8 karakters zijn")
  .max(128, "Wachtwoord mag maximaal 128 karakters zijn")
  .refine(
    (password) => /[A-Z]/.test(password),
    "Wachtwoord moet minimaal één hoofdletter bevatten"
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "Wachtwoord moet minimaal één kleine letter bevatten"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "Wachtwoord moet minimaal één cijfer bevatten"
  );

const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Naam is verplicht")
  .max(100, "Naam mag maximaal 100 karakters zijn")
  .refine(
    (name) => /^[a-zA-ZÀ-ÿ\s\-'.]+$/.test(name),
    "Naam bevat ongeldige karakters"
  );

const signInSchema = z.object({
  email: z.string().trim().min(1, "E-mailadres is verplicht").email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
});

export default function Auth() {
  const navigate = useNavigate();
  const { invalidateAndRefresh } = useSubscription();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaUserId, setMfaUserId] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("signin");

  const navigateAfterLogin = async () => {
    // Invalidate cache and refresh subscription before navigating
    invalidateSubscriptionCache();
    await invalidateAndRefresh();
    navigate("/");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearValidationErrors();
    
    // Validate input
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (error) throw error;

      // Check if MFA is enabled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(factor => factor.status === 'verified');

      if (totpFactor && data.user) {
        // MFA is enabled, need to verify
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        });

        if (challengeError) throw challengeError;

        // store both the factor id and the challenge id
        setMfaFactorId(totpFactor.id);
        setMfaChallengeId((challengeData as any)?.id ?? "");
        setMfaUserId(data.user.id ?? "");
        setShowTwoFactor(true);
        setLoading(false);
        return;
      }

      toast({
        title: "Ingelogd",
        description: "U bent succesvol ingelogd.",
      });
      await navigateAfterLogin();
    } catch (error: any) {
      toast({
        title: "Fout bij inloggen",
        description: error.message || "Er is een fout opgetreden.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (code: string, type: 'app' | 'email' | 'backup' = 'app') => {
    try {
      if (type === 'backup') {
        // Verify backup code on the server (we added verify_backup_code SQL function)
        try {
          const { data: verifyData, error: verifyError } = await (supabase as any).rpc('verify_backup_code', { p_user: mfaUserId, p_code: code });
          if (verifyError) throw verifyError;

          const ok = verifyData === true || verifyData === 't' || verifyData === 1;
          if (!ok) {
            throw new Error('Backup code ongeldig');
          }

          // Backup code accepted. Send a magic link to the user's email to complete sign-in.
          const { error: mailError } = await supabase.auth.signInWithOtp({ email });
          if (mailError) throw mailError;

          toast({ title: 'Backup code geaccepteerd', description: 'Een aanmeldlink is naar uw e-mail gestuurd. Gebruik de link om in te loggen.' });
          setShowTwoFactor(false);
          await supabase.auth.signOut();
          return true;
        } catch (err: any) {
          toast({ title: 'Verificatie mislukt', description: err.message || 'De ingevoerde backup code is onjuist.', variant: 'destructive' });
          return false;
        }
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code,
      });

      if (error) throw error;

      toast({
        title: "Ingelogd",
        description: "U bent succesvol ingelogd.",
      });
      
      setShowTwoFactor(false);
      await navigateAfterLogin();
      return true;
    } catch (error: any) {
      toast({
        title: "Verificatie mislukt",
        description: error.message || "De ingevoerde code is onjuist. Probeer het opnieuw.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    supabase.auth.signOut();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearValidationErrors();
    
    // Validate input
    const result = signUpSchema.safeParse({ email, password, fullName });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          data: {
            full_name: result.data.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account aangemaakt",
        description: "U kunt nu inloggen.",
      });
    } catch (error: any) {
      toast({
        title: "Fout bij registreren",
        description: error.message || "Er is een fout opgetreden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="h-8 w-8 animate-pulse rounded-full bg-primary/30" />
            </div>
            <Skeleton className="mx-auto h-7 w-48" />
            <Skeleton className="mx-auto h-5 w-56" />
          </CardHeader>
          <CardContent className="space-y-6 px-6">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Skeleton className="mx-auto h-4 w-64" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <>
      <TwoFactorDialog
        open={showTwoFactor}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
        codeType="app"
      />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 overflow-x-hidden">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Feitcodes Applicatie</CardTitle>
            <CardDescription>
              Hulpmiddel voor het opstellen van redenen van wetenschap
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); clearValidationErrors(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Inloggen</TabsTrigger>
                <TabsTrigger value="signup">Registreren</TabsTrigger>
              </TabsList>
              <div className="relative mt-6">
                <AnimatePresence mode="wait" initial={false}>
                  {activeTab === "signin" && (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email">E-mailadres</Label>
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="naam@amsterdam.nl"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (validationErrors.email) {
                                setValidationErrors((prev) => ({ ...prev, email: "" }));
                              }
                            }}
                            maxLength={255}
                            aria-invalid={!!validationErrors.email}
                          />
                          {validationErrors.email && (
                            <p className="text-sm text-destructive">{validationErrors.email}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signin-password">Wachtwoord</Label>
                          <Input
                            id="signin-password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (validationErrors.password) {
                                setValidationErrors((prev) => ({ ...prev, password: "" }));
                              }
                            }}
                            maxLength={128}
                            aria-invalid={!!validationErrors.password}
                          />
                          {validationErrors.password && (
                            <p className="text-sm text-destructive">{validationErrors.password}</p>
                          )}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Bezig met inloggen..." : "Inloggen"}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                  {activeTab === "signup" && (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Volledige naam</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Jan Jansen"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (validationErrors.fullName) {
                                setValidationErrors((prev) => ({ ...prev, fullName: "" }));
                              }
                            }}
                            maxLength={100}
                            aria-invalid={!!validationErrors.fullName}
                          />
                          {validationErrors.fullName && (
                            <p className="text-sm text-destructive">{validationErrors.fullName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">E-mailadres</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="naam@amsterdam.nl"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (validationErrors.email) {
                                setValidationErrors((prev) => ({ ...prev, email: "" }));
                              }
                            }}
                            maxLength={255}
                            aria-invalid={!!validationErrors.email}
                          />
                          {validationErrors.email && (
                            <p className="text-sm text-destructive">{validationErrors.email}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Wachtwoord</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (validationErrors.password) {
                                setValidationErrors((prev) => ({ ...prev, password: "" }));
                              }
                            }}
                            maxLength={128}
                            aria-invalid={!!validationErrors.password}
                          />
                          {validationErrors.password && (
                            <p className="text-sm text-destructive">{validationErrors.password}</p>
                          )}
                          <PasswordStrengthIndicator password={password} />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Bezig met registreren..." : "Registreren"}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tabs>
          </CardContent>
          <CardFooter className="px-6 pb-6">
            <p className="text-center text-sm text-muted-foreground w-full">
              Alleen voor geautoriseerd personeel van de Gemeente Amsterdam.
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
