import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search as SearchIcon, FileText, Plus } from "lucide-react";
import { RVWGenerator } from "@/components/RVWGenerator";
import { toast } from "@/hooks/use-toast";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFactcode, setSelectedFactcode] = useState<any>(null);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: feitcodes, isLoading } = useQuery({
    queryKey: ["feitcodes", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("feitcodes")
        .select("*")
        .order("access_count", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `factcode.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.limit(9);
      if (error) throw error;
      return data;
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("factcode_suggestions").insert({
        suggested_code: suggestedCode,
        description: suggestedDescription,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Suggestie ingediend",
        description:
          "Uw suggestie is ingediend en wordt beoordeeld door een beheerder.",
      });
      setSuggestDialogOpen(false);
      setSuggestedCode("");
      setSuggestedDescription("");
    },
    onError: () => {
      toast({
        title: "Fout",
        description:
          "Er is een fout opgetreden bij het indienen van uw suggestie.",
        variant: "destructive",
      });
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

          {searchTerm ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Zoekresultaten voor "
              <span className="font-medium">{searchTerm}</span>":
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Populaire feitcodes:
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="col-span-full text-center text-muted-foreground">
                Laden...
              </p>
            ) : feitcodes?.length === 0 ? (
              <div className="col-span-full text-center space-y-4">
                <p className="text-muted-foreground">Geen feitcodes gevonden</p>
                <Dialog
                  open={suggestDialogOpen}
                  onOpenChange={setSuggestDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Suggereer een feitcode
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Feitcode suggereren</DialogTitle>
                      <DialogDescription>
                        Stuur een suggestie voor een nieuwe feitcode. Deze wordt
                        beoordeeld door een beheerder.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="suggested-code">Feitcode</Label>
                        <Input
                          id="suggested-code"
                          value={suggestedCode}
                          onChange={(e) => setSuggestedCode(e.target.value)}
                          placeholder="Bijv. R315b"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="suggested-description">
                          Omschrijving
                        </Label>
                        <Textarea
                          id="suggested-description"
                          value={suggestedDescription}
                          onChange={(e) =>
                            setSuggestedDescription(e.target.value)
                          }
                          placeholder="Omschrijving van de feitcode"
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={() => suggestMutation.mutate()}
                        disabled={
                          !suggestedCode.trim() ||
                          !suggestedDescription.trim() ||
                          suggestMutation.isPending
                        }
                        className="w-full"
                      >
                        {suggestMutation.isPending
                          ? "Versturen..."
                          : "Verstuur suggestie"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              feitcodes
                ?.sort((a, b) => b.access_count - a.access_count)
                .map((code) => (
                  <Card
                    key={code.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary duration-300"
                    onClick={() => setSelectedFactcode(code)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {code.factcode}
                        </CardTitle>
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
