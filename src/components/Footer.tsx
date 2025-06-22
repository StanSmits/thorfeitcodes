import React from 'react';
import { Settings } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-2">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">
            © {currentYear} Stan Smits
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;