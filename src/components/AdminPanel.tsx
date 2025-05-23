import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { FactCode } from '../types/factCode';
import { factCodes } from '../data/factCodes';

const AdminPanel: React.FC = () => {
  const [codes, setCodes] = useState<FactCode[]>(factCodes);
  const [editingCode, setEditingCode] = useState<FactCode | null>(null);
  const [newCode, setNewCode] = useState<FactCode>({
    code: '',
    description: '',
    template: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleEdit = (code: FactCode) => {
    setEditingCode({ ...code });
  };

  const handleSave = (code: FactCode) => {
    setCodes(codes.map(c => c.code === code.code ? code : c));
    setEditingCode(null);
  };

  const handleDelete = (code: FactCode) => {
    if (window.confirm('Weet je zeker dat je deze feitcode wilt verwijderen?')) {
      setCodes(codes.filter(c => c.code !== code.code));
    }
  };

  const handleAdd = () => {
    if (newCode.code && newCode.description && newCode.template) {
      setCodes([...codes, newCode]);
      setNewCode({ code: '', description: '', template: '' });
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Feitcodes Beheer</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Feitcode</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <input
                type="text"
                value={newCode.description}
                onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <textarea
                value={newCode.template}
                onChange={(e) => setNewCode({ ...newCode, template: e.target.value })}
                className="input-primary h-32"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAdding(false)}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleAdd}
                className="btn-primary"
                disabled={!newCode.code || !newCode.description || !newCode.template}
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschrijving</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {codes.map((code) => (
              <tr key={code.code}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {editingCode?.code === code.code ? (
                    <input
                      type="text"
                      value={editingCode.code}
                      onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value })}
                      className="input-primary"
                    />
                  ) : (
                    code.code
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {editingCode?.code === code.code ? (
                    <input
                      type="text"
                      value={editingCode.description}
                      onChange={(e) => setEditingCode({ ...editingCode, description: e.target.value })}
                      className="input-primary w-full"
                    />
                  ) : (
                    code.description
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingCode?.code === code.code ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingCode(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSave(editingCode)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(code)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;