import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "../config/supabase";
import { FactCode } from "../types/factCode";
import { useToast } from "../hooks/useToast";
import { Input, Button, TextArea } from "./ui";
import TemplateDisplay from "./TemplateDisplay";
import { factCodeSuggestionService } from "../services/factCodeSuggestionService";

const SuggestionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  initialCode?: string;
}> = ({ open, onClose, initialCode }) => {
  const [form, setForm] = useState({
    suggested_code: initialCode || "",
    description: "",
    template: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, suggested_code: initialCode || "" }));
    }
  }, [initialCode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await factCodeSuggestionService.addSuggestion(form);
      showSuccess("Suggestie ingestuurd! Dank je wel.");
      setForm({ suggested_code: "", description: "", template: "" });
      onClose();
    } catch {
      showError("Suggestie kon niet worden ingestuurd.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4">Stel een nieuwe feitcode voor</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Voorgestelde code"
            name="suggested_code"
            value={form.suggested_code}
            onChange={handleChange}
            required
          />
          <Input
            label="Beschrijving"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
          <TextArea
            label="Reden van Wetenschap (optioneel)"
            name="template"
            value={form.template}
            onChange={handleChange}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Annuleren</Button>
            <Button type="submit" isLoading={isSubmitting}>Verstuur suggestie</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SearchSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<FactCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<FactCode | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
    inputRef.current?.focus();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

    useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm.trim() || selectedCode) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("feitcodes")
          .select("factcode")
          .ilike("factcode", `%${searchTerm.toLowerCase()}%`)
          .order("access_count", { ascending: false })
          .limit(5);

        if (error) throw error;

        setSuggestions(data.map(item => ({ code: item.factcode, description: '', template: '' })));
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        showError("Failed to fetch suggestions");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCode]);

  const fetchFactCodeDetails = async (code: string): Promise<FactCode | null> => {
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from("feitcodes")
        .select("id, factcode, description, template, field_options")
        .eq("factcode", code)
        .single();

      if (error) throw error;

      await supabase.rpc('increment_access_count', { item_id: code });

      return {
        id: data.id,
        code: data.factcode,
        description: data.description,
        template: data.template,
        field_options: data.field_options || {},
      };
    } catch (error) {
      console.error("Error fetching fact code details:", error);
      showError("Failed to fetch fact code details");
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedCode(null);
  };

  const handleSelectCode = async (suggestion: { code: string }) => {
    const factCode = await fetchFactCodeDetails(suggestion.code);
    if (factCode) {
      setSelectedCode(factCode);
      setSearchTerm(factCode.code);
      setSuggestions([]);
      updateRecentSearches(factCode.code);
    }
  };

  const updateRecentSearches = (code: string) => {
    const updatedSearches = [
      code,
      ...recentSearches.filter((s) => s !== code),
    ].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
        <p className="text-sm text-center font-semibold">
          Deze website is nog in BETA. Er kunnen fouten optreden en niet alles
          klopt. Gebruik met voorzichtigheid!
        </p>
        <p className="text-xs text-center mt-2">
          Voor opmerkingen of feedback, neem contact op met{" "}
          <a
            href="mailto:stan.smits@amsterdam.nl"
            className="text-red-600 hover:underline"
          >
            stan.smits@amsterdam.nl
          </a>
          {" "}met in de titel: FEITCODEZOEKER
        </p>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Feitcode Zoeker
        </h2>
        <p className="text-sm text-gray-600">
          Zoek een feitcode om een gestandaardiseerde reden van wetenschap te
          genereren
        </p>
      </div>

      <div ref={searchRef} className="search-input-container mb-6">
        <div className="relative">
          <Input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-10 py-3 text-lg shadow-sm"
            placeholder="Zoek op feitcode..."
            aria-label="Zoek feitcode"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="search-results mt-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.code}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 transition duration-200"
                onClick={() => handleSelectCode(suggestion)}
              >
                <span className="font-medium text-[#004699]">
                  {suggestion.code}
                </span>
              </div>
            ))}
          </div>
        )}

        {!suggestions.length && searchTerm && !selectedCode && !isLoading && (
          <div className="search-results p-4 text-center mt-2">
            <div className="flex flex-col items-center text-gray-600">
              <AlertCircle className="h-6 w-6 mb-2 text-gray-400" />
              <p>Geen feitcodes gevonden voor &quot;{searchTerm}&quot;</p>
              <Button
                className="mt-3"
                onClick={() => {
                  setShowSuggestionModal(true)
                  
                }}
              >
                Stel een nieuwe feitcode voor
              </Button>
            </div>
          </div>
        )}
      </div>

      {recentSearches.length > 0 && !selectedCode && (
        <div className="mb-6 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Recente zoekopdrachten
            </h3>
            <Button
              variant="secondary"
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem("recentSearches");
              }}
              icon={Trash2}
              className="p-1"
              aria-label="Verwijder recente zoekopdrachten"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((code) => (
              <Button
                key={code}
                variant="secondary"
                onClick={() => handleSelectCode({ code })}
                className="text-sm"
              >
                {code}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoadingDetails ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        selectedCode && <TemplateDisplay factCode={selectedCode} />
      )}

      <SuggestionModal open={showSuggestionModal} onClose={() => setShowSuggestionModal(false)} initialCode={searchTerm} />
    </div>
  );
};

export default SearchSection;