import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, FileText } from 'lucide-react';
import { RVWGenerator } from '@/components/RVWGenerator';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFactcode, setSelectedFactcode] = useState<any>(null);

  const { data: feitcodes, isLoading } = useQuery({
    queryKey: ['feitcodes', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('feitcodes')
        .select('*')
        .order('access_count', { ascending: false });

      if (searchTerm) {
        query = query.or(`factcode.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(9);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zoek Feitcode</h1>
        <p className="text-muted-foreground">
          Zoek een feitcode om een reden van wetenschap te genereren
        </p>
      </div>

      {!selectedFactcode ? (
        <>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek op feitcode of omschrijving..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Meest populaire feitcodes:
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="col-span-full text-center text-muted-foreground">Laden...</p>
            ) : feitcodes?.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">
                Geen feitcodes gevonden
              </p>
            ) : (
              feitcodes?.sort((a, b) => b.access_count - a.access_count).map((code) => (
                <Card
                  key={code.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary duration-300"
                  onClick={() => setSelectedFactcode(code)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{code.factcode}</CardTitle>
                    </div>
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
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <RVWGenerator
          factcode={selectedFactcode}
          onBack={() => setSelectedFactcode(null)}
        />
      )}
    </div>
  );
}