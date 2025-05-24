import React, { useState, useEffect, useRef } from "react";
import { Search, AlertCircle, X, Loader2 } from "lucide-react";
import TemplateDisplay from "./TemplateDisplay";
import { supabase } from "../supabaseClient";
import { FactCode } from "../types/factCode";

const SearchSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<FactCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<FactCode | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
          .limit(5);

        if (error) {
          console.error("Supabase error:", error);
          setSuggestions([]);
          return;
        }

        const suggestionsData = data.map((item) => ({
          code: item.factcode,
        }));

        setSuggestions(suggestionsData);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedCode]);

  const fetchFactCodeDetails = async (code: string): Promise<FactCode | null> => {
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from("feitcodes")
        .select("id, factcode, description, template")
        .eq("factcode", code)
        .single();

        supabase.rpc('increment_access_count', { item_id: code }).then(({ data }) => {
          console.log('Access count incremented:', data);
        });

      if (error) {
        console.error("Error fetching fact code details:", error);
        return null;
      }

      return {
        id: data.id,
        code: data.factcode,
        description: data.description,
        template: data.template,
      };
    } catch (error) {
      console.error("Error fetching fact code details:", error);
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
      const updatedSearches = [
        factCode.code,
        ...recentSearches.filter((s) => s !== factCode.code),
      ].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSuggestions([]);
    setSelectedCode(null);
    inputRef.current?.focus();
  };

  const handleRecentSearch = async (code: string) => {
    const factCode = await fetchFactCodeDetails(code);
    if (factCode) {
      handleSelectCode({ code: factCode.code });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sectie die groots in het rood aangeeft dat de website nog in BETA is en er fouten kunnen optreden / niet alles klopt */}
      <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
        <p className="text-sm text-center font-semibold">
          Deze website is nog in BETA. Er kunnen fouten optreden en niet alles
          klopt. Gebruik met voorzichtigheid!
        </p>
        {/* Sectie, voor opmerkingen: contact met: stan.smits@amsterdam.nl met in de titel: FEITCODEZOEKER */}
        <p className="text-xs text-center mt-2">
          Voor opmerkingen of feedback, neem contact op met{" "}
          <a
            href="mailto:stan.smits@amsterdam.nl"
            className="text-red-600 hover:underline"
          > stan.smits@amsterdam.nl </a>
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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="input-primary pl-10 pr-10 py-3 text-lg shadow-sm"
            placeholder="Zoek op feitcode..."
            aria-label="Zoek feitcode"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="search-results mt-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.code}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 transition duration-200"
                onClick={() => handleSelectCode(suggestion)}
              >
                <div className="flex items-start">
                  <span className="font-medium text-[#004699]">
                    {suggestion.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!suggestions.length && searchTerm && !selectedCode && !isLoading && (
          <div className="search-results p-4 text-center mt-2">
            <div className="flex flex-col items-center text-gray-600">
              <AlertCircle className="h-6 w-6 mb-2 text-gray-400" />
              <p>Geen feitcodes gevonden voor &quot;{searchTerm}&quot;</p>
            </div>
          </div>
        )}
      </div>

      {recentSearches.length > 0 && !selectedCode && (
        <div className="mb-6 mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Recent gezocht:
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((code) => (
              <button
                key={code}
                onClick={() => handleRecentSearch(code)}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200 transition duration-300"
              >
                {code}
              </button>
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
    </div>
  );
};

export default SearchSection;