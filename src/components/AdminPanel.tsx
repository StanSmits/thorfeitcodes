import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FactCode } from "../types/factCode";
import { FactCodeSuggestion } from "../types/factCode";
import { useAuth } from "../hooks/useAuth";
import { useFactCodes } from "../hooks/useFactCodes";
import { Button, Input, TextArea } from "./ui";
import { highlightTemplateFields } from "../utils/templateUtils";
import FactCodeTable from "./FactCodeTable";
import SearchInput from "./SearchInput";
import { factCodeSuggestionService } from "../services/factCodeSuggestionService";

const DEBOUNCE_MS = 250;

const AdminPanel: React.FC = () => {
  const [currentCode, setCurrentCode] = useState<FactCode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"factcodes" | "suggestions">(
    "factcodes"
  );
  const [suggestions, setSuggestions] = useState<FactCodeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
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

  // Fetch suggestions for the suggestions tab
  useEffect(() => {
    if (activeTab === "suggestions") {
      setIsLoadingSuggestions(true);
      factCodeSuggestionService
        .fetchSuggestions()
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoadingSuggestions(false));
    }
  }, [activeTab]);

  // Save handler with refresh
  const handleSave = async () => {
    if (!currentCode?.code || !currentCode.description || !currentCode.template)
      return;
    try {
      if (isEditing && currentCode.id) {
        await updateFactCode(currentCode.id, currentCode);
        await fetchFactCodes(); // Refresh list after update
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
    if (
      !code.id ||
      !window.confirm("Weet je zeker dat je deze feitcode wilt verwijderen?")
    ) {
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
    const parts = highlightTemplateFields(currentCode.template);

    return (
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-gray-800 whitespace-pre-line">
        {parts.map((part, idx) =>
          typeof part === "string"
            ? React.createElement("span", { key: idx }, part)
            : React.createElement(
                "span",
                {
                  key: idx,
                  className: "bg-yellow-100 text-yellow-800 px-1 rounded",
                },
                `{${part.field}}`
              )
        )}
      </div>
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

  const handleApproveSuggestion = async (suggestion: FactCodeSuggestion) => {
    // Add as new fact code, then mark suggestion as accepted
    try {
      await addFactCode({
        code: suggestion.suggested_code,
        description: suggestion.description,
        template: suggestion.template,
      });
      await factCodeSuggestionService.updateSuggestionStatus(
        suggestion.id!,
        "accepted"
      );
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestion.id ? { ...s, status: "accepted" } : s
        )
      );
      fetchFactCodes();
    } catch (err) {
      // Optionally show error toast
      console.error(err);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (
      !window.confirm("Weet je zeker dat je deze suggestie wilt verwijderen?")
    )
      return;
    try {
      await factCodeSuggestionService.deleteSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const [editingSuggestion, setEditingSuggestion] =
    useState<FactCodeSuggestion | null>(null);
  const [editForm, setEditForm] = useState({
    suggested_code: "",
    description: "",
    template: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (s: FactCodeSuggestion) => {
    setEditingSuggestion(s);
    setEditForm({
      suggested_code: s.suggested_code,
      description: s.description,
      template: s.template,
    });
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEditSuggestion = async () => {
    if (!editingSuggestion) return;
    setIsSavingEdit(true);
    try {
      handleApproveSuggestion({
        ...editingSuggestion,
        suggested_code: editForm.suggested_code,
        description: editForm.description,
        template: editForm.template,
      });
      setEditingSuggestion(null);
      setEditForm({ suggested_code: "", description: "", template: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

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
              setCurrentCode({
                id: "",
                code: "",
                description: "",
                template: "",
              });
              setIsEditing(false);
              setActiveTab("factcodes");
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

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "factcodes"
              ? "border-b-2 border-[#ec0000] text-[#ec0000]"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("factcodes")}
        >
          Feitcodes beheren
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "suggestions"
              ? "border-b-2 border-[#ec0000] text-[#ec0000]"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("suggestions")}
        >
          Suggesties
        </button>
      </div>

      {activeTab === "factcodes" && (
        <>
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
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                />
                <TextArea
                  label="Template"
                  value={currentCode.template}
                  onChange={(e) =>
                    handleFieldChange("template", e.target.value)
                  }
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
        </>
      )}

      {activeTab === "suggestions" && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4">Ingestuurde Suggesties</h2>

          {editingSuggestion && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#ec0000]/20">
              <div className="grid gap-4">
                <Input
                  label="Voorgestelde code"
                  name="suggested_code"
                  value={editForm.suggested_code}
                  onChange={handleEditFormChange}
                  required
                />
                <Input
                  label="Beschrijving"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  required
                />
                <TextArea
                  label="Reden van Wetenschap"
                  name="template"
                  value={editForm.template}
                  onChange={handleEditFormChange}
                />
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    Preview:
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-gray-800 whitespace-pre-line">
                    {highlightTemplateFields(editForm.template).map(
                      (part, idx) =>
                        typeof part === "string" ? (
                          <span key={idx}>{part}</span>
                        ) : (
                          <span
                            key={idx}
                            className="bg-yellow-100 text-yellow-800 px-1 rounded"
                          >{`{${part.field}}`}</span>
                        )
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setEditingSuggestion(null)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    onClick={saveEditSuggestion}
                    isLoading={isSavingEdit}
                  >
                    Goedkeuren en inboeken
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoadingSuggestions ? (
            <div>Bezig met laden...</div>
          ) : suggestions.filter((s) => s.status !== "accepted").length ===
            0 ? (
            <div className="text-gray-500">Geen suggesties gevonden.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Beschrijving
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suggestions
                  .filter((s) => s.status !== "accepted")
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-mono">
                        {s.suggested_code}
                      </td>
                      <td className="px-4 py-2">{s.description}</td>
                      <td className="px-4 py-2 text-xs">
                        {s.status || "pending"}
                      </td>
                      <td className="px-4 py-2 text-right flex gap-2 justify-end">
                        <Button
                          variant="primary"
                          onClick={() => openEditModal(s)}
                        >
                          Controleren
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDeleteSuggestion(s.id!)}
                        >
                          Verwijderen
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
