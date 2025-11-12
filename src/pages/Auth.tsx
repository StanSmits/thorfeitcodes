import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaUserId, setMfaUserId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
      navigate("/");
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
      navigate("/");
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
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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

  return (
    <>
      <TwoFactorDialog
        open={showTwoFactor}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
        codeType="app"
      />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Feitcodes Applicatie</CardTitle>
            <CardDescription>
              Hulpmiddel voor het opstellen van redenen van wetenschap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Inloggen</TabsTrigger>
                <TabsTrigger value="signup">Registreren</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mailadres</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="naam@voorbeeld.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Wachtwoord</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Bezig met inloggen..." : "Inloggen"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Volledige naam</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Jan Jansen"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mailadres</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="naam@voorbeeld.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Wachtwoord</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Bezig met registreren..." : "Registreren"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            Alleen voor geautoriseerd personeel
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
