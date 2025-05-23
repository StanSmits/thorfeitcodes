import React from 'react';
import { Settings } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-2">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-300">
            © {currentYear} Gemeente Amsterdam
          </p>
          <div className="flex items-center space-x-4">
            <a 
              href="/admin" 
              className="flex items-center space-x-1 text-sm text-gray-300 hover:text-white transition duration-300"
            >
              <Settings className="w-4 h-4" />
              <span>Admin Panel</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;