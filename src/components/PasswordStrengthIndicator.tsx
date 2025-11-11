import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', checks: [] };

    let score = 0;
    const checks = [
      { label: 'Minimaal 8 karakters', passed: password.length >= 8 },
      { label: 'Bevat hoofdletter', passed: /[A-Z]/.test(password) },
      { label: 'Bevat kleine letter', passed: /[a-z]/.test(password) },
      { label: 'Bevat cijfer', passed: /[0-9]/.test(password) },
      { label: 'Bevat speciaal teken', passed: /[^A-Za-z0-9]/.test(password) },
    ];

    score = checks.filter(check => check.passed).length;

    let label = '';
    let color = '';

    if (score <= 2) {
      label = 'Zwak';
      color = 'bg-destructive';
    } else if (score === 3) {
      label = 'Gemiddeld';
      color = 'bg-yellow-500';
    } else if (score === 4) {
      label = 'Sterk';
      color = 'bg-blue-500';
    } else {
      label = 'Zeer sterk';
      color = 'bg-green-500';
    }

    return { score: (score / 5) * 100, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Wachtwoordsterkte:</span>
          <span className={`font-medium ${
            strength.score <= 40 ? 'text-destructive' :
            strength.score <= 60 ? 'text-yellow-600' :
            strength.score <= 80 ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="relative">
          <Progress value={strength.score} className="h-2" />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        {strength.checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {check.passed ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.passed ? 'text-foreground' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility: compute a strength score (0-100) using the same checks as the component

