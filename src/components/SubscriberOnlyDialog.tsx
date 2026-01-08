import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Star, FileText, Sparkles } from 'lucide-react';

interface SubscriberOnlyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'favorites' | 'saved-rvws' | 'generator';
  remaining?: number;
}

export function SubscriberOnlyDialog({
  open,
  onOpenChange,
  feature,
  remaining,
}: SubscriberOnlyDialogProps) {
  const navigate = useNavigate();

  const featureDetails = {
    favorites: {
      icon: Star,
      title: 'Favorieten zijn alleen voor abonnees',
      description: 'Met een premium abonnement kunt u onbeperkt feitcodes als favoriet markeren en ze snel terugvinden.',
    },
    'saved-rvws': {
      icon: FileText,
      title: 'Opgeslagen RvW\'s zijn alleen voor abonnees',
      description: 'Met een premium abonnement kunt u onbeperkt redenen van wetenschap opslaan en later opnieuw gebruiken.',
    },
    generator: {
      icon: Sparkles,
      title: remaining !== undefined ? `Nog ${remaining} generaties vandaag` : 'Dagelijkse limiet bereikt',
      description: remaining !== undefined && remaining > 0
        ? `U heeft nog ${remaining} van de 5 gratis generaties over vandaag. Upgrade naar premium voor onbeperkt gebruik.`
        : 'U heeft uw dagelijkse limiet van 5 gratis generaties bereikt. Upgrade naar premium voor onbeperkt gebruik.',
    },
  };

  const details = featureDetails[feature];
  const Icon = details.icon;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{details.title}</DialogTitle>
          <DialogDescription className="text-center">
            {details.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Premium voordelen</p>
                <p className="text-sm text-muted-foreground">
                  Onbeperkte toegang tot alle functies
                </p>
              </div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Onbeperkt favorieten markeren
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Onbeperkt RvW's opslaan
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Onbeperkte generaties per dag
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full gap-2">
            <Crown className="h-4 w-4" />
            Bekijk abonnementen
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
