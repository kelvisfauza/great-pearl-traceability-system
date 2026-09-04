import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceManager } from "@/components/admin/AttendanceManager";
import { AttendanceReport } from "@/components/admin/AttendanceReport";

const AttendancePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Attendance</h1>
            </div>
            <p className="text-muted-foreground text-lg">Track daily attendance and review monthly records</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="daily" className="space-y-4">
              <TabsList>
                <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
                <TabsTrigger value="report">Attendance Report</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <AttendanceManager />
              </TabsContent>
              <TabsContent value="report">
                <AttendanceReport />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
