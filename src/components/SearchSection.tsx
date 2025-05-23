import React, { useState, useEffect, useRef } from "react";
import { Search, AlertCircle, X } from "lucide-react";
import TemplateDisplay from "./TemplateDisplay";
import { supabase } from "../supabaseClient";
import { FactCode } from "../types/factCode";

const SearchSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<FactCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<FactCode | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Laad recente zoekopdrachten en focus op het zoekveld
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

  // Haal suggesties op op basis van de zoekterm via Supabase
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm.trim() || selectedCode) {
        setSuggestions([]);
        return;
      }

      const normalizedTerm = searchTerm.toLowerCase();
      // Query op de kolom "factcode" met een limiet
      const { data: factcodeData, error: factcodeError } = await supabase
        .from("feitcodes")
        .select("id, factcode, description, template")
        .ilike("factcode", `%${normalizedTerm}%`)
        .limit(8);

      if (factcodeError) {
        console.error("Supabase fout:", factcodeError);
        setSuggestions([]);
        return;
      }

      // Extra query op de description (optioneel)
      const { data: descriptionData, error: descriptionError } = await supabase
        .from("feitcodes")
        .select("id, factcode, description, template")
        .ilike("description", `%${normalizedTerm}%`)
        .limit(8);

      if (descriptionError) {
        console.error("Supabase fout bij description:", descriptionError);
        setSuggestions([]);
        return;
      }

      // Merge de twee resultaten en filter op unieke waarden op basis van "factcode"
      const merged = [...(factcodeData || []), ...(descriptionData || [])];
      const uniqueMap = new Map<string, any>();
      merged.forEach((item) => {
        uniqueMap.set(item.factcode, item);
      });
      const uniqueArray = Array.from(uniqueMap.values());

      // Transformeer: maak property "code" op basis van "factcode"
      const suggestionsData = uniqueArray.slice(0, 8).map((item: any) => ({
        id: item.id.toString(),
        code: item.factcode,
        description: item.description,
        template: item.template,
      }));
      setSuggestions(suggestionsData);
    };

    fetchSuggestions();
  }, [searchTerm, selectedCode]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedCode(null);
  };

  const handleSelectCode = (code: FactCode) => {
    setSelectedCode(code);
    setSearchTerm(code.code);
    setSuggestions([]);
    const updatedSearches = [
      code.code,
      ...recentSearches.filter((s) => s !== code.code),
    ].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSuggestions([]);
    setSelectedCode(null);
    inputRef.current?.focus();
  };

  const handleRecentSearch = async (code: string) => {
    // Controleer of de code al in de suggesties staat
    let foundCode = suggestions.find((c) => c.code === code);

    // Als de code niet in de suggesties staat, haal alle feitcodes op
    if (!foundCode) {
      try {
        const allFactCodes = await supabase
          .from("feitcodes")
          .select("id, factcode, description, template");

        if (allFactCodes.error) {
          console.error(
            "Fout bij het ophalen van feitcodes:",
            allFactCodes.error
          );
          return;
        }

        // Zoek de code in de opgehaalde feitcodes
        foundCode = allFactCodes.data.find((c: any) => c.factcode === code);

        // Map de database-kolom 'factcode' naar 'code' voor de frontend
        if (foundCode) {
          foundCode = {
            id: foundCode.id,
            code: foundCode.factcode,
            description: foundCode.description,
            template: foundCode.template,
          };
        }
      } catch (error) {
        console.error("Fout bij het ophalen van feitcodes:", error);
        return;
      }
    }

    // Als de code is gevonden, selecteer deze
    if (foundCode) {
      handleSelectCode(foundCode as FactCode);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="input-primary pl-10 pr-10 py-3 text-lg shadow-sm"
            placeholder="Zoek op feitcode of omschrijving..."
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
            {suggestions.map((code) => (
              <div
                key={code.code}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 transition duration-200"
                onClick={() => handleSelectCode(code)}
              >
                <div className="flex items-start">
                  <span className="font-medium text-[#004699] mr-2">
                    {code.code}
                  </span>
                  <span className="text-gray-700">{code.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!suggestions.length && searchTerm && !selectedCode && (
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

      {selectedCode && <TemplateDisplay factCode={selectedCode} />}
    </div>
  );
};

export default SearchSection;
