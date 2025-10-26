import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminFeitcodes } from '@/components/admin/AdminFeitcodes';
import { AdminSuggestions } from '@/components/admin/AdminSuggestions';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminRoadSigns } from '@/components/admin/AdminRoadSigns';

export default function Admin() {
  const { isModerator, isAdmin } = useAuth();

  if (!isModerator) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Beheer</h1>
        <p className="text-muted-foreground">
          Beheer feitcodes, suggesties, verkeerstekens en gebruikers
        </p>
      </div>

      <Tabs defaultValue="feitcodes" className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="feitcodes">Feitcodes</TabsTrigger>
          <TabsTrigger value="suggestions">Suggesties</TabsTrigger>
          <TabsTrigger value="road-signs">Verkeerstekens</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Gebruikers</TabsTrigger>}
        </TabsList>

        <TabsContent value="feitcodes" className="mt-6">
          <AdminFeitcodes />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          <AdminSuggestions />
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