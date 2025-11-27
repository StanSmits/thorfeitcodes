import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFactcode, setSelectedFactcode] = useState<any>(null);
  const [initialFormValues, setInitialFormValues] = useState<Record<string,string> | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"popular" | "newest" | "all">("popular");
  const location = useLocation();

  // If navigated here with a prefill (from SavedRvws), load that factcode and form values
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill || !prefill.factcode) return;

    const loadPrefill = async () => {
      try {
        const { data, error } = await supabase
          .from('feitcodes')
          .select('*')
          .eq('factcode', prefill.factcode)
          .limit(1)
          .single();

        if (error) {
          console.error('Failed to fetch prefill factcode', error);
          return;
        }

        setSelectedFactcode(data);
        if (prefill.form_values) {
          setInitialFormValues(prefill.form_values);
        }
      } catch (err) {
        console.error('Error loading prefill', err);
      }
    };

    loadPrefill();
  }, [location?.state]);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: feitcodes, isLoading } = useQuery({
    queryKey: ["feitcodes", searchTerm, viewMode],
    queryFn: async () => {
      let query = supabase
        .from("feitcodes")
        .select("*");

      if (searchTerm) {
        query = query
          .ilike("factcode", `%${searchTerm}%`)
          .order("factcode", { ascending: true });
      } else {
        // Sort based on view mode
        if (viewMode === "popular") {
          query = query.order("access_count", { ascending: false });
        } else if (viewMode === "newest") {
          query = query.order("created_at", { ascending: false });
        } else {
          // "all" - alphabetical
          query = query.order("factcode", { ascending: true });
        }
      }

      const { data, error } = await query.limit(viewMode === "all" ? 100 : 9);
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
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              Zoekresultaten voor "
              <span className="font-medium">{searchTerm}</span>":
            </motion.p>
          ) : (
            <div className="space-y-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="popular" className="relative">
                    Populair
                  </TabsTrigger>
                  <TabsTrigger value="newest" className="relative">
                    Nieuwste
                  </TabsTrigger>
                  <TabsTrigger value="all" className="relative">
                    Alles
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <AnimatePresence mode="wait">
                <motion.p
                  key={viewMode}
                  initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="text-sm text-muted-foreground"
                >
                  {viewMode === "popular" && "Populaire feitcodes:"}
                  {viewMode === "newest" && "Nieuwste feitcodes:"}
                  {viewMode === "all" && "Alle feitcodes:"}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode + searchTerm}
              initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {isLoading ? (
                <>
                  {Array.from({ length: viewMode === "all" ? 9 : 9 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </>
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
                  <DialogContent className="max-h-[80vh] overflow-auto">
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
                feitcodes.map((code, index) => (
                  <motion.div
                    key={code.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card
                    key={code.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary duration-300"
                    onClick={() => {
                      setSelectedFactcode(code);
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
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
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <RVWGenerator
          factcode={selectedFactcode}
          onBack={() => { setSelectedFactcode(null); setInitialFormValues(undefined); }}
          initialFormValues={initialFormValues}
        />
      )}
    </div>
  );
}
