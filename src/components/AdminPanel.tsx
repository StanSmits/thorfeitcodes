import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { FactCode } from "../types/factCode";
import {
  fetchFactCodesFromApi,
  addFactCodeToApi,
  updateFactCodeInApi,
  deleteFactCodeFromApi,
} from "../api/factCodesApi";

const AdminPanelPage: React.FC = () => {
  const [codes, setCodes] = useState<FactCode[]>([]);
  const [currentCode, setCurrentCode] = useState<FactCode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      console.log('Sessie:', data); // Controleer of de sessie correct wordt opgehaald
      if (!data.session) {
        navigate('/login'); // Stuur niet-ingelogde gebruikers naar de login-pagina
      }
    };
  
    checkAuth();
  }, [navigate]);

  // Haal feitcodes op bij het laden van de pagina
  useEffect(() => {
    const loadFactCodes = async () => {
      try {
        setIsLoading(true);
        const data = await fetchFactCodesFromApi();

        // Data is al gemapped in de API-functie
        setCodes(data);
      } catch (err) {
        console.error(err);
        toast.error("Fout bij het ophalen van feitcodes.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFactCodes();
  }, []);

  const handleSave = async () => {
    if (!currentCode) return;

    try {
      // Map de frontend 'code' property naar database kolom 'factcode'
      const apiPayload = {
        ...currentCode,
        factcode: currentCode.code, // Map 'code' naar 'factcode'
      };

      if (isEditing && currentCode.id) {
        await updateFactCodeInApi(currentCode.id, apiPayload);
        toast.success("Feitcode succesvol bijgewerkt!");
      } else {
        await addFactCodeToApi(apiPayload);
        toast.success("Nieuwe feitcode succesvol toegevoegd!");
      }

      // Haal de bijgewerkte lijst op
      const data = await fetchFactCodesFromApi();

      // Map opnieuw de database data naar frontend formaat
      const mappedCodes = data.map((item) => ({
        id: item.id,
        code: item.factcode, // Gebruik 'factcode' uit de database
        description: item.description,
        template: item.template,
      }));

      setCodes(mappedCodes);
      setCurrentCode(null);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Fout bij het opslaan van de feitcode.");
    }
  };

  const handleEdit = (code: FactCode) => {
    setCurrentCode({ ...code });
    setIsEditing(true);
  };

  const handleDelete = async (code: FactCode) => {
    if (!window.confirm("Weet je zeker dat je deze feitcode wilt verwijderen?"))
      return;

    try {
      if (!code.id) {
        throw new Error("Geen ID gevonden voor deze feitcode");
      }

      await deleteFactCodeFromApi(code.id);
      toast.success("Feitcode succesvol verwijderd!");

      // Haal de bijgewerkte lijst op
      const data = await fetchFactCodesFromApi();
      const mappedCodes = data.map((item) => ({
        id: item.id,
        code: item.factcode, // Gebruik 'factcode' uit de database
        description: item.description,
        template: item.template,
      }));

      setCodes(mappedCodes);
    } catch (error) {
      console.error(error);
      toast.error("Fout bij het verwijderen van de feitcode.");
    }
  };

  const handleFieldChange = (field: keyof FactCode, value: string) => {
    if (currentCode) {
      setCurrentCode({ ...currentCode, [field]: value });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Succesvol uitgelogd!");
    navigate("/login");
  };

  const renderTemplatePreview = () => {
    if (!currentCode || !currentCode.template) return null;

    const fieldRegex = /\{([^}]+)\}/g;
    let template = currentCode.template;
    const matches = [...template.matchAll(fieldRegex)];

    matches.forEach((match) => {
      const field = match[1];
      template = template.replace(
        match[0],
        `<span class="bg-yellow-100 text-yellow-800 px-1 rounded">
          ${currentCode[field as keyof FactCode] || `[${field}]`}
        </span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: template }} />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Feitcodes Beheer
      </h1>

      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => {
            setCurrentCode({ id: "", code: "", description: "", template: "" });
            setIsEditing(false);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Feitcode</span>
        </button>
        <button onClick={handleLogout} className="btn-secondary">
        Uitloggen
      </button>
      </div>

      {currentCode && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={currentCode.code}
                onChange={(e) => handleFieldChange("code", e.target.value)}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <input
                type="text"
                value={currentCode.description}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <textarea
                value={currentCode.template}
                onChange={(e) => handleFieldChange("template", e.target.value)}
                className="input-primary h-32"
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">
                Template Preview:
              </h4>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                {renderTemplatePreview()}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCurrentCode(null)}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={
                  !currentCode.code ||
                  !currentCode.description ||
                  !currentCode.template
                }
              >
                {isEditing ? "Opslaan" : "Toevoegen"}
              </button>
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
              {codes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Geen feitcodes gevonden
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
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
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(code)}
                          className="text-red-600 hover:text-red-900 flex items-center space-x-1"
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

export default AdminPanelPage;
