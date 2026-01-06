import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, X, FileText, ChevronRight, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SkeletonListItem } from "@/components/ui/SkeletonCard";

export default function SavedRvws() {
  const [factcodeFilter, setFactcodeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: any) => {
      const { error } = await supabase
        .from("saved_rvws")
        .delete()
        .eq("id", id as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Verwijderd",
        description: "De opgeslagen RvW is verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["saved-rvws"] });
    },
    onError: (err) => {
      
      toast({
        title: "Fout",
        description: "Kon opgeslagen RvW niet verwijderen.",
        variant: "destructive",
      });
    },
  });

  const { data: savedRvws, isLoading } = useQuery({
    queryKey: ["saved-rvws"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_rvws")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const uniqueFactcodes = useMemo(() => {
    if (!savedRvws) return [];
    const codes = new Set(savedRvws.map((rvw) => rvw.factcode));
    return Array.from(codes).sort();
  }, [savedRvws]);

  const filteredRvws = useMemo(() => {
    if (!savedRvws) return [];

    return savedRvws.filter((rvw) => {
      if (factcodeFilter !== "all" && rvw.factcode !== factcodeFilter) {
        return false;
      }

      if (
        locationFilter &&
        !rvw.location_value.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false;
      }

      const rvwDate = new Date(rvw.created_at);

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (rvwDate < fromDate) {
          return false;
        }
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (rvwDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [savedRvws, factcodeFilter, locationFilter, dateFrom, dateTo]);

  const loadRecentRvw = async (rvw: any) => {
    // Best-effort: update the saved timestamp so it appears recent
    try {
      await supabase
        .from("saved_rvws")
        .update({ created_at: new Date().toISOString() })
        .eq("id", rvw.id);
    } catch (err) {
      
    }

    // Navigate to the generator page with prefilled form values
    navigate(`/generator/${rvw.factcode}`, {
      state: {
        formValues: rvw.form_values,
      },
    });
  };

  const clearFilters = () => {
    setFactcodeFilter("all");
    setLocationFilter("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters =
    factcodeFilter !== "all" || locationFilter !== "" || dateFrom || dateTo;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Opgeslagen RvW's</h1>
        <p className="text-muted-foreground">
          Bekijk en filter alle opgeslagen redenen van wetenschap
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter opgeslagen RvW's op feitcode, locatie of datum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="factcode-filter">Feitcode</Label>
              <Select value={factcodeFilter} onValueChange={setFactcodeFilter}>
                <SelectTrigger id="factcode-filter">
                  <SelectValue placeholder="Alle feitcodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle feitcodes</SelectItem>
                  {uniqueFactcodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-filter">Locatie</Label>
              <Input
                id="location-filter"
                placeholder="Zoek op locatie..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Datum van</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom
                      ? format(dateFrom, "PPP", { locale: nl })
                      : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Datum tot</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo
                      ? format(dateTo, "PPP", { locale: nl })
                      : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredRvws.length} resultaten gevonden
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Wis filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        ) : filteredRvws.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {hasActiveFilters
                  ? "Geen RvW's gevonden met de huidige filters."
                  : "Nog geen opgeslagen RvW's. Start met het genereren van een RvW op de zoekpagina."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRvws.map((rvw) => (
            <Card
              key={rvw.id}
              className="overflow-hidden"
              onClick={() => loadRecentRvw(rvw)}
            >
              <CardContent className="bg-muted/25 p-4 cursor-pointer hover:bg-muted/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono">
                      {rvw.factcode}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {rvw.location_value} •{" "}
                      {format(new Date(rvw.created_at), "PPP 'om' HH:mm", {
                        locale: nl,
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Confirm before deletion
                        if (
                          confirm(
                            "Weet je zeker dat je deze opgeslagen RvW wilt verwijderen?"
                          )
                        ) {
                          deleteMutation.mutate(rvw.id);
                        }
                      }}
                      aria-label="Verwijder opgeslagen RvW"
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
