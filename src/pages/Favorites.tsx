import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, FileText } from 'lucide-react';
import { RVWGenerator } from '@/components/RVWGenerator';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export default function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();
  const [selectedFactcode, setSelectedFactcode] = useState<any>(null);

  const { data: feitcodes, isLoading } = useQuery({
    queryKey: ['favorite-feitcodes', favorites],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const { data, error } = await supabase
        .from('feitcodes')
        .select('*')
        .in('id', favorites);
      if (error) throw error;
      return data;
    },
    enabled: favorites.length > 0,
  });

  if (selectedFactcode) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <RVWGenerator
          factcode={selectedFactcode}
          onBack={() => setSelectedFactcode(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mijn Favorieten</h1>
        <p className="text-muted-foreground">
          Jouw opgeslagen favoriete feitcodes
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Geen favorieten</h3>
          <p className="text-muted-foreground mt-1">
            Klik op het ster-icoon bij een feitcode om deze toe te voegen aan je favorieten.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              feitcodes?.map((code, index) => (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary duration-300 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(code.id);
                      }}
                    >
                      <Star className="h-4 w-4 fill-primary text-primary" />
                    </Button>
                    <div onClick={() => setSelectedFactcode(code)}>
                      <CardHeader>
                        <CardTitle className="text-lg pr-8">{code.factcode}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {code.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>Klik om RVW te genereren</span>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
