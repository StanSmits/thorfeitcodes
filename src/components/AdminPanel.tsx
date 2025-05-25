import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FactCode } from "../types/factCode";
import { useAuth } from "../hooks/useAuth";
import { useFactCodes } from "../hooks/useFactCodes";
import { Button, Input, TextArea } from "./ui";
import { extractTemplateFields, replaceTemplateFields } from "../utils/templateUtils";

const AdminPanel: React.FC = () => {
  const [currentCode, setCurrentCode] = useState<FactCode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { 
    isLoading,
    factCodes,
    fetchFactCodes,
    addFactCode,
    updateFactCode,
    deleteFactCode 
  } = useFactCodes();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchFactCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, navigate]);

  const handleSave = async () => {
    if (!currentCode?.code || !currentCode.description || !currentCode.template) return;

    try {
      if (isEditing && currentCode.id) {
        await updateFactCode(currentCode.id, currentCode);
      } else {
        await addFactCode(currentCode);
      }
      setCurrentCode(null);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
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
        extractTemplateFields(currentCode.template).map(field => [
          field,
          currentCode[field as keyof FactCode] || ''
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

      {isLoading ? (
        <div className="text-center py-8">Bezig met laden...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschrijving
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {factCodes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Geen feitcodes gevonden
                  </td>
                </tr>
              ) : (
                factCodes.map((code) => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {code.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {code.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => handleEdit(code)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(code)}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;