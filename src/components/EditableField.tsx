import React from 'react';

interface EditableFieldProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({ name, value, onChange }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Vul ${name.toLowerCase()} in...`}
      className="editable-field w-full"
      aria-label={name}
    />
  );
};

export default EditableField;