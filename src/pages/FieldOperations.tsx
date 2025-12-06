import { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldDashboard } from '@/components/field/FieldDashboard';
import { FarmerManagement } from '@/components/field/FarmerManagement';
import { FieldPurchaseForm } from '@/components/field/FieldPurchaseForm';
import { DailyReportForm } from '@/components/field/DailyReportForm';
import { AttendanceCheckIn } from '@/components/field/AttendanceCheckIn';
import { LayoutDashboard, Users, ShoppingCart, ClipboardList, MapPin, DollarSign } from 'lucide-react';
import { FieldFinancing } from '@/components/field/FieldFinancing';

const FieldOperations = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleNavigate = (section: string) => {
    setActiveTab(section);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Field Operations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage field activities, farmers, and daily operations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-muted/50 p-1 rounded-xl gap-1">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="farmers" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Farmers
              </TabsTrigger>
              <TabsTrigger value="purchase" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Purchase
              </TabsTrigger>
              <TabsTrigger value="financing" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Financing
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Report
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Attendance
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <FieldDashboard onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="farmers" className="space-y-6">
            <FarmerManagement />
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <FieldPurchaseForm />
          </TabsContent>

          <TabsContent value="financing" className="space-y-6">
            <FieldFinancing />
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
