import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminFeitcodes } from '@/components/admin/AdminFeitcodes';
import { AdminSuggestions } from '@/components/admin/AdminSuggestions';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminRoadSigns } from '@/components/admin/AdminRoadSigns';

export default function Admin() {
  const { isModerator, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('feitcodes');
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Beheer</h1>
        <p className="text-muted-foreground">
          Beheer feitcodes, suggesties, verkeerstekens en gebruikers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="feitcodes">Feitcodes</TabsTrigger>
          <TabsTrigger value="suggestions">Suggesties</TabsTrigger>
          <TabsTrigger value="road-signs">Verkeerstekens</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Gebruikers</TabsTrigger>}
        </TabsList>

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