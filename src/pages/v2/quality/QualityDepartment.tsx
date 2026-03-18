import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FlaskConical, RefreshCw, Settings2, BookOpen, BarChart3, 
  Warehouse, FileText, Lightbulb, GraduationCap, CheckSquare, Trophy
} from "lucide-react";
import BatchAssessmentsTab from "@/components/v2/quality/tabs/BatchAssessmentsTab";
import ReEvaluationTab from "@/components/v2/quality/tabs/ReEvaluationTab";
import CalibrationTab from "@/components/v2/quality/tabs/CalibrationTab";
import DefectLibraryTab from "@/components/v2/quality/tabs/DefectLibraryTab";
import SupplierAnalyticsTab from "@/components/v2/quality/tabs/SupplierAnalyticsTab";
import WarehouseMonitoringTab from "@/components/v2/quality/tabs/WarehouseMonitoringTab";
import ReportsTab from "@/components/v2/quality/tabs/ReportsTab";
import RecommendationsTab from "@/components/v2/quality/tabs/RecommendationsTab";
import TrainingTab from "@/components/v2/quality/tabs/TrainingTab";
import DailyChecklistTab from "@/components/v2/quality/tabs/DailyChecklistTab";
import PerformanceTab from "@/components/v2/quality/tabs/PerformanceTab";

const tabs = [
  { id: "assessments", label: "Assessments", icon: FlaskConical },
  { id: "reevaluation", label: "Re-evaluation", icon: RefreshCw },
  { id: "calibration", label: "Calibration", icon: Settings2 },
  { id: "defects", label: "Defect Library", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "warehouse", label: "Warehouse", icon: Warehouse },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "performance", label: "Performance", icon: Trophy },
];

const QualityDepartment = () => {
  const [activeTab, setActiveTab] = useState("assessments");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quality Department</h1>
            <p className="text-muted-foreground mt-1">
              Coffee quality control, analysis & supplier management
            </p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1.5"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="assessments"><BatchAssessmentsTab /></TabsContent>
              <TabsContent value="reevaluation"><ReEvaluationTab /></TabsContent>
              <TabsContent value="calibration"><CalibrationTab /></TabsContent>
              <TabsContent value="defects"><DefectLibraryTab /></TabsContent>
              <TabsContent value="analytics"><SupplierAnalyticsTab /></TabsContent>
              <TabsContent value="warehouse"><WarehouseMonitoringTab /></TabsContent>
              <TabsContent value="reports"><ReportsTab /></TabsContent>
              <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>
              <TabsContent value="training"><TrainingTab /></TabsContent>
              <TabsContent value="checklist"><DailyChecklistTab /></TabsContent>
              <TabsContent value="performance"><PerformanceTab /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDepartment;
