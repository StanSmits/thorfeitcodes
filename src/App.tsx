import React from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

function App() {
  const isAdminRoute = window.location.pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" />
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {isAdminRoute ? <AdminPanel /> : <SearchSection />}
      </main>
      <Footer />
    </div>
  );
}

export default App;