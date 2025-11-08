import { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldDashboard } from '@/components/field/FieldDashboard';
import { FarmerManagement } from '@/components/field/FarmerManagement';
import { FieldPurchaseForm } from '@/components/field/FieldPurchaseForm';
import { DailyReportForm } from '@/components/field/DailyReportForm';
import { AttendanceCheckIn } from '@/components/field/AttendanceCheckIn';
import { LayoutDashboard, Users, ShoppingCart, ClipboardList, MapPin } from 'lucide-react';

const FieldOperations = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleNavigate = (section: string) => {
    setActiveTab(section);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Field Operations</h1>
          <p className="text-muted-foreground">
            Manage field activities, farmers, and daily operations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="farmers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Farmers
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Purchase
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Daily Report
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <FieldDashboard onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="farmers" className="space-y-6">
            <FarmerManagement />
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <FieldPurchaseForm />
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <DailyReportForm />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <AttendanceCheckIn />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FieldOperations;
