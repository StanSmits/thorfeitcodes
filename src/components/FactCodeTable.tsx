import React from "react";
import { Edit, Trash } from "lucide-react";
import { FactCode } from "../types/factCode";
import { Button } from "./ui/Button";

interface FactCodeTableProps {
  factCodes: FactCode[];
  onEdit: (code: FactCode) => void;
  onDelete: (code: FactCode) => void;
  isLoading: boolean;
}

const FactCodeTable: React.FC<FactCodeTableProps> = ({
  factCodes,
  onEdit,
  onDelete,
  isLoading,
}) => (
  <div className="bg-white rounded-lg shadow max-h-lvh overflow-y-auto">
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
        {isLoading ? (
          <tr>
            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
              Bezig met laden...
            </td>
          </tr>
        ) : factCodes.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
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
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onEdit(code)}
                    className="text-gray-500 hover:text-gray-900"
                    aria-label="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onDelete(code)}
                    className="text-red-600 hover:text-red-900"
                    aria-label="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default FactCodeTable;