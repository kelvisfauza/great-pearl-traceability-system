import { useState } from "react";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FlaskConical, RefreshCw, Settings2, BookOpen, BarChart3, LayoutGrid, FileSignature,
  Warehouse, FileText, Lightbulb, GraduationCap, CheckSquare, Trophy, History, ShieldCheck, Paperclip, Truck
} from "lucide-react";
import { useQualityRole } from "@/hooks/useQualityRole";
import QualityApprovalsTab from "@/components/v2/quality/tabs/QualityApprovalsTab";
import BatchAssessmentsTab from "@/components/v2/quality/tabs/BatchAssessmentsTab";
import ReEvaluationTab from "@/components/v2/quality/tabs/ReEvaluationTab";
import AssessmentHistoryTab from "@/components/v2/quality/tabs/AssessmentHistoryTab";
import CalibrationTab from "@/components/v2/quality/tabs/CalibrationTab";
import DefectLibraryTab from "@/components/v2/quality/tabs/DefectLibraryTab";
import SupplierAnalyticsTab from "@/components/v2/quality/tabs/SupplierAnalyticsTab";
import WarehouseMonitoringTab from "@/components/v2/quality/tabs/WarehouseMonitoringTab";
import ReportsTab from "@/components/v2/quality/tabs/ReportsTab";
import RecommendationsTab from "@/components/v2/quality/tabs/RecommendationsTab";
import TrainingTab from "@/components/v2/quality/tabs/TrainingTab";
import DailyChecklistTab from "@/components/v2/quality/tabs/DailyChecklistTab";
import PerformanceTab from "@/components/v2/quality/tabs/PerformanceTab";
import QualityAnalysisFilesTab from "@/components/v2/quality/tabs/QualityAnalysisFilesTab";
import QualityOverviewTab from "@/components/v2/quality/tabs/QualityOverviewTab";
import DispatchMonitoringTab from "@/components/v2/quality/tabs/DispatchMonitoringTab";
import QualityAnalysisFormDownload from "@/components/expenses/QualityAnalysisFormDownload";
import AdminRejectedLotsReview from "@/components/admin/AdminRejectedLotsReview";

const allTabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "assessments", label: "Assessments", icon: FlaskConical },
  { id: "approvals", label: "Approvals", icon: ShieldCheck, headOnly: true },
  { id: "discretion", label: "Rejected Lots", icon: FileText, headOnly: true },
  { id: "reevaluation", label: "Re-evaluation", icon: RefreshCw },
  { id: "dispatch", label: "Dispatch Monitoring", icon: Truck },
  { id: "analysis-form", label: "Analysis Form", icon: FileSignature },
  { id: "files", label: "Analysis Files", icon: Paperclip },
  { id: "history", label: "History", icon: History, headOnly: true },
  { id: "calibration", label: "Calibration", icon: Settings2 },
  { id: "defects", label: "Defect Library", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3, headOnly: true },
  { id: "warehouse", label: "Warehouse", icon: Warehouse },
  { id: "reports", label: "Reports", icon: FileText, headOnly: true },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb, headOnly: true },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "performance", label: "Performance", icon: Trophy, headOnly: true },
];

const QualityDepartment = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { isQualityHead } = useQualityRole();
  const tabs = allTabs.filter((t) => !t.headOnly || isQualityHead);

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

              <TabsContent value="overview"><QualityOverviewTab onNavigate={setActiveTab} /></TabsContent>
              <TabsContent value="assessments"><BatchAssessmentsTab /></TabsContent>
              {isQualityHead && <TabsContent value="approvals"><QualityApprovalsTab /></TabsContent>}
              {isQualityHead && <TabsContent value="discretion"><AdminRejectedLotsReview /></TabsContent>}
              <TabsContent value="reevaluation"><ReEvaluationTab /></TabsContent>
              <TabsContent value="dispatch"><DispatchMonitoringTab /></TabsContent>
              <TabsContent value="analysis-form"><QualityAnalysisFormDownload /></TabsContent>
      <TabsContent value="files"><QualityAnalysisFilesTab /></TabsContent>
              {isQualityHead && <TabsContent value="history"><AssessmentHistoryTab /></TabsContent>}
              <TabsContent value="calibration"><CalibrationTab /></TabsContent>
              <TabsContent value="defects"><DefectLibraryTab /></TabsContent>
              {isQualityHead && <TabsContent value="analytics"><SupplierAnalyticsTab /></TabsContent>}
              <TabsContent value="warehouse"><WarehouseMonitoringTab /></TabsContent>
              {isQualityHead && <TabsContent value="reports"><ReportsTab /></TabsContent>}
              {isQualityHead && <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>}
              <TabsContent value="training"><TrainingTab /></TabsContent>
              <TabsContent value="checklist"><DailyChecklistTab /></TabsContent>
              {isQualityHead && <TabsContent value="performance"><PerformanceTab /></TabsContent>}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDepartment;
