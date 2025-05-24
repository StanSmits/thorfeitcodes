import React from "react";
import AmsterdamLogo from "./AmsterdamLogo";

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div
          className="flex items-center space-x-4"
          onClick={() => (window.location.href = "/")}
          role="button"
        >
          <div className="w-6 h-6">{/* <AmsterdamLogo /> */}</div>
          <div>
            <h1 className="text-base font-bold">Feitcode Tool</h1>
          </div>
          <div className="ml-6 hover:col-red-600">
            <a
              href="/"
              className="text-sm text-gray-700 hover:text-red-600 transition-colors duration-300 ml-2"
              aria-label="Ga naar de homepage"
            >
              Home
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
