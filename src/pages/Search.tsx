import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Search as SearchIcon, FileText, Plus, X, Clock, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useFavorites } from "@/hooks/useFavorites";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<"popular" | "newest" | "all">(
    (searchParams.get('view') as "popular" | "newest" | "all") || "popular"
  );
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Sync search term and view mode to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (viewMode !== 'popular') params.set('view', viewMode);
    setSearchParams(params, { replace: true });
  }, [searchTerm, viewMode, setSearchParams]);

  // Listen for global Ctrl+K focus event
  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener('focus-search', handleFocusSearch);
    return () => window.removeEventListener('focus-search', handleFocusSearch);
  }, []);
  
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");

  // Add to search history when user stops typing
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const timer = setTimeout(() => {
      addToHistory(searchTerm.trim());
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, addToHistory]);

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

  // Keyboard shortcuts: Escape to go back, Enter to select first result
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape: Go back in history
      if (event.key === 'Escape') {
        const isInDialog = document.activeElement?.closest('[role="dialog"]');
        if (isInDialog) return;
        
        if (window.history.length > 1) {
          navigate(-1);
        }
      }

      // Enter: Navigate to first result when search input is focused
      if (event.key === 'Enter') {
        const isSearchFocused = document.activeElement === searchInputRef.current;
        if (isSearchFocused && feitcodes && feitcodes.length > 0) {
          event.preventDefault();
          navigate(`/generator/${feitcodes[0].factcode}`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, feitcodes]);

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

  const handleCardClick = (factcode: string) => {
    navigate(`/generator/${factcode}`, { 
      state: { searchQuery: searchTerm || null } 
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zoek Feitcode</h1>
        <p className="text-muted-foreground">
          Zoek een feitcode om een reden van wetenschap te genereren
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Zoek op feitcode of omschrijving..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          className="pl-10"
        />
        
        {/* Search History Dropdown */}
        <AnimatePresence>
          {showHistory && history.length > 0 && !searchTerm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-card shadow-lg"
            >
              <div className="p-2">
                <p className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recente zoekopdrachten
                </p>
                {history.map((term) => (
                  <div
                    key={term}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      setSearchTerm(term);
                      setShowHistory(false);
                    }}
                  >
                    <span className="text-sm">{term}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(term);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
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
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary duration-300 relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(code.id);
                    }}
                  >
                    <Star className={`h-4 w-4 ${isFavorite(code.id) ? 'fill-favorite text-favorite' : 'text-muted-foreground'}`} />
                  </Button>
                  <div onClick={() => handleCardClick(code.factcode)}>
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
    </div>
  );
}
