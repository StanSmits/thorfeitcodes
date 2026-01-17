import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminFeitcodes } from '@/components/admin/AdminFeitcodes';
import { AdminSuggestions } from '@/components/admin/AdminSuggestions';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminRoadSigns } from '@/components/admin/AdminRoadSigns';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function Admin() {
  const { isModerator, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'feitcodes');
  const [prefillData, setPrefillData] = useState<any>(null);

  if (!isModerator) {
    return <Navigate to="/" replace />;
  }

  const handleApproveSuggestion = (suggestion: any) => {
    setPrefillData({
      factcode: suggestion.suggested_code,
      description: suggestion.description,
      template: suggestion.template || '',
      field_options: suggestion.field_options || {},
    });
    setActiveTab('feitcodes');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Beheer</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Beheer feitcodes, suggesties, verkeerstekens en gebruikers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={isAdmin ? 'dashboard' : 'feitcodes'} className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:flex sm:flex-wrap h-auto gap-1 p-1">
          {isAdmin && <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3">Dashboard</TabsTrigger>}
          <TabsTrigger value="feitcodes" className="text-xs sm:text-sm px-2 sm:px-3">Feitcodes</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs sm:text-sm px-2 sm:px-3">Suggesties</TabsTrigger>
          <TabsTrigger value="road-signs" className="text-xs sm:text-sm px-2 sm:px-3">Verkeerstekens</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3">Gebruikers</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="dashboard" className="mt-6">
            <AdminDashboard />
          </TabsContent>
        )}

        <TabsContent value="feitcodes" className="mt-6">
          <AdminFeitcodes prefillData={prefillData} onClearPrefill={() => setPrefillData(null)} />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          <AdminSuggestions onApprove={handleApproveSuggestion} />
        </TabsContent>

        <TabsContent value="road-signs" className="mt-6">
          <AdminRoadSigns />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <AdminUsers />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}