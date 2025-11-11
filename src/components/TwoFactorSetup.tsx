import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, Smartphone, Copy, Check, QrCode, Type, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState('');
  // challengeId is not required for enroll verification; Supabase verify for enroll uses factorId + code
  const [copied, setCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<'scan' | 'verify' | 'backup'>('scan');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisableVerify, setShowDisableVerify] = useState(false);
  const [disableVerificationCode, setDisableVerificationCode] = useState('');
  const [disableFactorId, setDisableFactorId] = useState('');
  const [disableChallengeId, setDisableChallengeId] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const { user } = useAuth();

  // Helper to compute SHA-256 hex digest of a string
  const sha256Hex = async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactor = data?.totp?.find(factor => factor.status === 'verified');
      setIsEnabled(!!totpFactor);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleEnableMfa = async () => {
    setLoading(true);
    try {
      // First, check for and clean up any incomplete factors
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      
      if (existingFactors?.totp) {
        for (const factor of existingFactors.totp) {
          if (factor.status !== 'verified') {
            // Unenroll incomplete factors
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      }

      // Now proceed with enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

    // data contains enrolled factor id and totp details
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
      setSetupStep('scan');
      setShowSetup(true);
    } catch (error: any) {
      toast({
        title: 'Fout bij instellen 2FA',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For enrollment verification we request a challenge first, then verify with that challengeId
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const cid = (challengeData as any)?.id;
      if (!cid) {
        throw new Error('Geen challenge id ontvangen');
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: cid,
        code: verificationCode,
      });

      if (error) throw error;

      // Generate backup codes after successful verification
      const codes = generateBackupCodes();
      setBackupCodes(codes);

      // Hash backup codes and store only hashes + used flag in profiles table
      try {
        const hashes = await Promise.all(codes.map((c) => sha256Hex(c)));

        // Build JSON objects with hash and used flag
        const payload = hashes.map((h) => ({ hash: h, used: false, created_at: new Date().toISOString() }));

        if (user?.id) {
          const { error: updateError } = await (supabase as any)
            .from('profiles')
            .update({ backup_codes: payload })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to store backup code hashes in profiles:', updateError);
            // Fall back: do not block user from seeing codes, but warn
            toast({ title: 'Waarschuwing', description: 'Kon backup codes niet veilig opslaan op de server. Sla ze lokaal op.', variant: 'destructive' });
          }
        } else {
          console.warn('No user id available to store backup codes');
        }
      } catch (err) {
        console.error('Error hashing/storing backup codes', err);
        toast({ title: 'Waarschuwing', description: 'Er is iets misgegaan bij het opslaan van backup codes. Sla ze lokaal op.', variant: 'destructive' });
      }

      setSetupStep('backup');
    } catch (error: any) {
      toast({
        title: 'Verificatie mislukt',
        description: 'De ingevoerde code is onjuist. Probeer het opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(factor => factor.status === 'verified');

      if (!totpFactor) {
        // nothing verified: try unenrolling any incomplete factor directly
        if (factors?.totp?.length) {
          for (const factor of factors.totp) {
            await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => {});
          }
        }

        toast({
          title: '2FA uitgeschakeld',
          description: 'Tweefactorauthenticatie is uitgeschakeld.',
        });
        setIsEnabled(false);
        return;
      }

      // If factor is verified, Supabase requires AAL2 to unenroll. Start a challenge
      // and ask the user to enter their current TOTP code to verify before unenrolling.
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const cid = (challengeData as any)?.id;
      setDisableFactorId(totpFactor.id);
      setDisableChallengeId(cid ?? '');
      setDisableVerificationCode('');
      setShowDisableVerify(true);
    } catch (error: any) {
      toast({
        title: 'Fout bij uitschakelen 2FA',
        description: error.message || 'Er is een fout opgetreden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDisable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDisableLoading(true);
    try {
      if (!disableFactorId) throw new Error('Geen factor geselecteerd');

      // Verify the code to elevate the session (AAL2) so we can unenroll
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: disableFactorId,
        challengeId: disableChallengeId,
        code: disableVerificationCode,
      });
      if (verifyError) throw verifyError;

      // After successful verification, unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: disableFactorId });
      if (unenrollError) throw unenrollError;

      toast({ title: '2FA uitgeschakeld', description: 'Tweefactorauthenticatie is uitgeschakeld.' });
      setIsEnabled(false);
      setShowDisableVerify(false);
      setDisableFactorId('');
      setDisableChallengeId('');
      setDisableVerificationCode('');
    } catch (err: any) {
      toast({ title: 'Verificatie mislukt', description: err.message || 'De ingevoerde code is onjuist.', variant: 'destructive' });
    } finally {
      setDisableLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([`Backup codes voor tweefactorauthenticatie\n\nBewaar deze codes op een veilige plek.\nElke code kan slechts één keer worden gebruikt.\n\n${text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: 'Gekopieerd',
      description: 'Backup codes zijn naar het klembord gekopieerd.',
    });
  };

  const handleFinishSetup = () => {
    toast({
      title: '2FA ingeschakeld',
      description: 'Tweefactorauthenticatie is succesvol ingeschakeld.',
    });
    
    setIsEnabled(true);
    setShowSetup(false);
    setSetupStep('scan');
    setVerificationCode('');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tweefactorauthenticatie (2FA)
          </CardTitle>
          <CardDescription>
            Extra beveiligingslaag voor uw account met een authenticatie-app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">
                Status: {isEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? 'Uw account is beveiligd met 2FA'
                  : 'Schakel 2FA in voor extra beveiliging'}
              </p>
            </div>
            {isEnabled ? (
              <Button
                variant="destructive"
                onClick={handleDisableMfa}
                disabled={loading}
              >
                Uitschakelen
              </Button>
            ) : (
              <Button onClick={handleEnableMfa} disabled={loading}>
                Inschakelen
              </Button>
            )}
          </div>

          {isEnabled && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                U wordt gevraagd om een code in te voeren wanneer u inlogt vanaf een nieuw apparaat.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSetup} onOpenChange={(open) => {
        if (!open) {
          // Clean up incomplete enrollment if user closes during setup
          if (factorId && setupStep !== 'backup') {
            supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
          }
          setSetupStep('scan');
          setShowSetup(false);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {setupStep === 'scan' && 'Tweefactorauthenticatie instellen'}
              {setupStep === 'verify' && 'Verificatiecode invoeren'}
              {setupStep === 'backup' && 'Backup codes opslaan'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'scan' && 'Scan de QR-code of voer de code handmatig in'}
              {setupStep === 'verify' && 'Voer de code uit uw authenticatie-app in om te verifiëren'}
              {setupStep === 'backup' && 'Bewaar deze codes op een veilige plek voor toegang zonder authenticatie-app'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {setupStep === 'scan' ? (
              <div 
                key="scan-step"
                className="space-y-4 animate-fade-in"
              >
                <Tabs defaultValue="qr" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="qr" className="gap-2">
                      <QrCode className="h-4 w-4" />
                      QR-code
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2">
                      <Type className="h-4 w-4" />
                      Handmatig
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="qr" className="space-y-4 mt-4">
                    <div className="flex flex-col items-center space-y-4">
                      {qrCode && (
                        <div className="rounded-lg border p-4 bg-white">
                          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                      )}
                      <Alert>
                        <Smartphone className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Scan deze code met Google Authenticator, Microsoft Authenticator, of Authy.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Voer deze code handmatig in uw authenticatie-app in:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={secret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={copySecret}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Alert>
                      <AlertDescription className="text-sm">
                        1. Open uw authenticatie-app<br/>
                        2. Kies "Account toevoegen" of "+"<br/>
                        3. Selecteer "Handmatige invoer"<br/>
                        4. Plak de bovenstaande code
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowSetup(false)}
                  >
                    Annuleren
                  </Button>
                  <Button 
                    className="flex-1 gap-2" 
                    onClick={() => setSetupStep('verify')}
                  >
                    Volgende
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : setupStep === 'verify' ? (
              <form 
                key="verify-step"
                onSubmit={handleVerifyAndEnable} 
                className="space-y-4 animate-fade-in"
              >
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Verificatiecode</Label>
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest font-mono"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Voer de 6-cijferige code uit uw authenticatie-app in
                  </p>
                </div>
                
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    De code wordt elke 30 seconden vernieuwd. Gebruik de meest recente code.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSetupStep('scan');
                      setVerificationCode('');
                    }}
                    disabled={loading}
                  >
                    Terug
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Verifiëren...' : 'Verifiëren'}
                  </Button>
                </div>
              </form>
            ) : (
              <div 
                key="backup-step"
                className="space-y-4 animate-fade-in"
              >
                <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                  <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Belangrijk:</strong> Bewaar deze codes op een veilige plek. Ze kunnen worden gebruikt om in te loggen als u geen toegang heeft tot uw authenticatie-app.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-background rounded border">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={copyBackupCodes}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiëren
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={downloadBackupCodes}
                  >
                    Download
                  </Button>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    Elke backup code kan slechts één keer worden gebruikt. Genereer nieuwe codes als u ze allemaal heeft opgebruikt.
                  </AlertDescription>
                </Alert>

                <Button 
                  className="w-full" 
                  onClick={handleFinishSetup}
                >
                  Voltooien
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog shown when disabling a verified factor: ask for a TOTP code to elevate to AAL2 */}
      <Dialog open={showDisableVerify} onOpenChange={(open) => {
        if (!open) {
          setShowDisableVerify(false);
          setDisableVerificationCode('');
          setDisableFactorId('');
          setDisableChallengeId('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bevestig uitschakelen 2FA</DialogTitle>
            <DialogDescription>
              Voer de 6-cijferige code uit uw authenticatie-app in om 2FA uit te schakelen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDisable} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verificatiecode</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableVerificationCode}
                onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setShowDisableVerify(false);
                setDisableVerificationCode('');
              }} disabled={disableLoading}>
                Annuleren
              </Button>
              <Button type="submit" variant="destructive" className="flex-1" disabled={disableLoading}>
                {disableLoading ? 'Bezig...' : 'Bevestigen en uitschakelen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
