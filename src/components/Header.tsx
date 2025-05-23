import React from 'react';
import AmsterdamLogo from './AmsterdamLogo';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center space-x-4">
          <div className="w-6 h-6">
            <AmsterdamLogo />
          </div>
          <div>
            <h1 className="text-base font-bold">Feitcode Tool</h1>
            <p className="text-xs text-gray-600">Gemeente Amsterdam</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;