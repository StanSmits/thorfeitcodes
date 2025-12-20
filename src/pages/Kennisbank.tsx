import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, SignpostBig, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useNavigate } from "react-router-dom";

export default function Kennisbank() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Fetch available sign types from database
  const { data: availableSignTypes } = useQuery({
    queryKey: ["available-sign-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("road_signs")
        .select("sign_type")
        .not("sign_type", "is", null);
      if (error) throw error;
      // Get unique sign types and sort them
      const uniqueTypes = [...new Set(data.map(r => r.sign_type))].filter(Boolean).sort();
      return uniqueTypes as string[];
    },
  });

  // Fetch road signs with type filter
  const { data: roadSigns, isLoading } = useQuery({
    queryKey: ["road-signs", searchTerm, selectedType],
    queryFn: async () => {
      let query = supabase.from("road_signs").select("*").order("sign_code");

      if (searchTerm) {
        query = query.or(
          `sign_code.ilike.%${searchTerm}%,sign_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      if (selectedType !== "all") {
        query = query.eq("sign_type", selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked feitcodes for all road signs
  const { data: roadSignLinks } = useQuery({
    queryKey: ['road-sign-feitcodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('road_sign_feitcodes')
        .select(`
          id,
          road_sign_id,
          feitcode_id,
          feitcodes (
            id,
            factcode,
            description
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Get links for a specific road sign
  const getLinksForSign = (signId: string) => {
    return roadSignLinks?.filter(link => link.road_sign_id === signId) || [];
  };

  const handleFeitcodeClick = (feitcode: any) => {
    navigate("/", {
      state: {
        prefill: {
          factcode: feitcode.factcode,
          form_values: feitcode.form_values,
          location_value: feitcode.location_value,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kennisbank RVV 1990</h1>
        <p className="text-muted-foreground">
          Overzicht van verkeerstekens volgens het Reglement Verkeersregels en
          Verkeerstekens 1990
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

        {/* Filter by sign type (A/B/C/D etc.) - only show types that exist */}
        {availableSignTypes && availableSignTypes.length > 0 && (
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="w-full flex-wrap h-auto">
              <TabsTrigger value="all" className="min-w-[40px]">
                Alle
              </TabsTrigger>
              {availableSignTypes.map((type) => (
                <TabsTrigger key={type} value={type} className="min-w-[40px]">
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <>
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : roadSigns?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SignpostBig className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                Geen verkeerstekens gevonden.
                <br />
                Neem contact op met een beheerder om tekens toe te voegen.
              </p>
            </CardContent>
          </Card>
        ) : (
          roadSigns?.map((sign) => {
            const links = getLinksForSign(sign.id);
            return (
              <Card
                key={sign.id}
                className="overflow-hidden transition-all hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{sign.sign_code}</CardTitle>
                      <Badge variant="secondary">
                        {sign.category
                          .split("_")
                          .map(
                            (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </Badge>
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
                <CardContent className="space-y-3">
                  <h3 className="font-semibold">{sign.sign_name}</h3>
                  {sign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {sign.description}
                    </p>
                  )}
                  
                  {/* Show linked feitcodes */}
                  {links.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Gekoppelde feitcodes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {links.map((link: any) => (
                          <Badge 
                            key={link.id} 
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleFeitcodeClick(link.feitcodes)}
                          >
                            {link.feitcodes?.factcode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
