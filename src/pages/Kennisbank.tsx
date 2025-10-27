import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, SignpostBig } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Kennisbank() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: roadSigns, isLoading } = useQuery({
    queryKey: ['road-signs', searchTerm, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('road_signs')
        .select('*')
        .order('sign_code');

      if (searchTerm) {
        query = query.or(`sign_code.ilike.%${searchTerm}%,sign_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const categories = [
    { value: 'all', label: 'Alle' },
    { value: 'verbod', label: 'Verbodsborden' },
    { value: 'gebod', label: 'Gebodsborden' },
    { value: 'voorrang', label: 'Voorrangsborden' },
    { value: 'waarschuwing', label: 'Waarschuwingsborden' },
    { value: 'aanwijzing', label: 'Aanwijzingsborden' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kennisbank RVV 1990</h1>
        <p className="text-muted-foreground">
          Overzicht van verkeerstekens volgens het Reglement Verkeersregels en Verkeerstekens 1990
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op code, naam of omschrijving..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="flex-1">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <p className="col-span-full text-center text-muted-foreground">Laden...</p>
        ) : roadSigns?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SignpostBig className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                Geen verkeerstekens gevonden.<br />
                Neem contact op met een beheerder om tekens toe te voegen.
              </p>
            </CardContent>
          </Card>
        ) : (
          roadSigns?.map((sign) => (
            <Card key={sign.id} className="overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{sign.sign_code}</CardTitle>
                    <Badge variant="secondary">{sign.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                  </div>
                  {sign.image_url && (
                    <img
                      src={sign.image_url}
                      alt={sign.sign_name}
                      className="h-16 w-16 rounded-md object-contain"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">{sign.sign_name}</h3>
                {sign.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {sign.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}