import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FactCode } from "../types/factCode";
import { useAuth } from "../hooks/useAuth";
import { useFactCodes } from "../hooks/useFactCodes";
import { Button, Input, TextArea } from "./ui";
import { extractTemplateFields, replaceTemplateFields } from "../utils/templateUtils";
import FactCodeTable from "./FactCodeTable";
import SearchInput from "./SearchInput";

const DEBOUNCE_MS = 250;

const AdminPanel: React.FC = () => {
  const [currentCode, setCurrentCode] = useState<FactCode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const {
    isLoading,
    factCodes,
    fetchFactCodes,
    addFactCode,
    updateFactCode,
    deleteFactCode,
  } = useFactCodes();
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search]);

  // Auth and initial data fetch
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchFactCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, navigate]);

  // Save handler with refresh
  const handleSave = async () => {
    if (!currentCode?.code || !currentCode.description || !currentCode.template) return;
    try {
      if (isEditing && currentCode.id) {
        await updateFactCode(currentCode.id, currentCode);
      } else {
        await addFactCode(currentCode);
      }
      await fetchFactCodes(); // Refresh list after save
      setCurrentCode(null);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      // Optionally show error toast here
    }
  };

  const handleEdit = (code: FactCode) => {
    setCurrentCode({ ...code });
    setIsEditing(true);
  };

  const handleDelete = async (code: FactCode) => {
    if (!code.id || !window.confirm("Weet je zeker dat je deze feitcode wilt verwijderen?")) {
      return;
    }
    try {
      await deleteFactCode(code.id);
      await fetchFactCodes(); // Refresh list after delete
    } catch (error) {
      console.error(error);
    }
  };

  const handleFieldChange = (field: keyof FactCode, value: string) => {
    if (currentCode) {
      setCurrentCode({ ...currentCode, [field]: value });
    }
  };

  const renderTemplatePreview = () => {
    if (!currentCode?.template) return null;
    const template = replaceTemplateFields(
      currentCode.template,
      Object.fromEntries(
        extractTemplateFields(currentCode.template).map((field) => [
          field,
          currentCode[field as keyof FactCode] || "",
        ])
      )
    );
    return (
      <div
        className="bg-gray-50 p-4 rounded-md border border-gray-200"
        dangerouslySetInnerHTML={{ __html: template }}
      />
    );
  };

  // Fast, case-insensitive search
  const filteredFactCodes = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return factCodes;
    return factCodes.filter(
      (fc) =>
        fc.code.toLowerCase().includes(q) ||
        fc.description.toLowerCase().includes(q)
    );
  }, [factCodes, debouncedSearch]);

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Feitcodes Beheer</h1>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setCurrentCode({ id: "", code: "", description: "", template: "" });
              setIsEditing(false);
            }}
            icon={Plus}
          >
            Nieuwe Feitcode
          </Button>
          <Button variant="secondary" onClick={logout}>
            Uitloggen
          </Button>
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Zoek op code of beschrijving..."
      />

      {currentCode && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid gap-4">
            <Input
              label="Code"
              value={currentCode.code}
              onChange={(e) => handleFieldChange("code", e.target.value)}
            />
            <Input
              label="Beschrijving"
              value={currentCode.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
            <TextArea
              label="Template"
              value={currentCode.template}
              onChange={(e) => handleFieldChange("template", e.target.value)}
              className="h-32"
            />
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">
                Template Preview:
              </h4>
              {renderTemplatePreview()}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentCode(null)}
              >
                Annuleren
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !currentCode.code ||
                  !currentCode.description ||
                  !currentCode.template
                }
              >
                {isEditing ? "Opslaan" : "Toevoegen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <FactCodeTable
        factCodes={filteredFactCodes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminPanel;