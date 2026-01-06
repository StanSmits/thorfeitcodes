import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Smartphone } from 'lucide-react';

interface TwoFactorDialogProps {
  open: boolean;
  onVerify: (code: string, type?: 'app' | 'email' | 'backup') => Promise<boolean>;
  onCancel: () => void;
  codeType?: 'app' | 'email';
}

export function TwoFactorDialog({ 
  open, 
  onVerify, 
  onCancel,
  codeType = 'app' 
}: TwoFactorDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'app' | 'email' | 'backup'>(codeType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'backup') {
      // Backup codes are typically 8 alphanumeric characters generated previously
      if (!/^[A-Z0-9]{6,16}$/i.test(code)) {
        toast({
          title: 'Ongeldige backup code',
          description: 'Voer een geldige backup code in (letters en cijfers).',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (code.length !== 6) {
        toast({
          title: 'Ongeldige code',
          description: 'De verificatiecode moet 6 cijfers bevatten.',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const success = await onVerify(code, mode);
      if (!success) {
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Tweefactorauthenticatie</DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'backup' ? (
              'Voer een van uw backup codes in (letters en cijfers).'
            ) : codeType === 'app' ? (
              'Voer de 6-cijferige code in uit uw authenticatie-app.'
            ) : (
              'Er is een e-mail gestuurd met een 6-cijferige code. Voer deze in om door te gaan.'
            )}
          </DialogDescription>
          <div className="mt-2 text-xs text-center">
            {mode !== 'backup' ? (
              <button type="button" className="text-primary underline" onClick={() => setMode('backup')}>Gebruik backup code</button>
            ) : (
              <button type="button" className="text-primary underline" onClick={() => setMode(codeType)}>Gebruik verificatie-app</button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">{mode === 'backup' ? 'Backup code' : 'Verificatiecode'}</Label>
            <Input
              id="verification-code"
              type="text"
              inputMode={mode === 'backup' ? 'text' : 'numeric'}
              pattern={mode === 'backup' ? undefined : '[0-9]*'}
              maxLength={mode === 'backup' ? 16 : 6}
              placeholder={mode === 'backup' ? 'ABCDEFG1' : '000000'}
              value={code}
              onChange={(e) => {
                const v = e.target.value;
                if (mode === 'backup') setCode(v.toUpperCase().replace(/[^A-Z0-9]/gi, ''));
                else setCode(v.replace(/\D/g, ''));
              }}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Annuleren
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Verifiëren...' : 'Verifiëren'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
