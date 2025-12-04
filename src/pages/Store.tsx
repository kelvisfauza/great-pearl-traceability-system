import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Plus,
  Package,
  Users,
  Scale,
  Truck,
  Factory,
  DollarSign,
  Edit,
  Trash2,
  FileText,
  Printer,
  Calendar,
  Eye,
} from "lucide-react";

import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useQualityControl } from "@/hooks/useQualityControl";
import { useProcessingOperations } from "@/hooks/useProcessingOperations";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "sonner";
import PriceTicker from "@/components/PriceTicker";
import { Autocomplete } from "@/components/ui/autocomplete";
import GRNPrintModal from "@/components/quality/GRNPrintModal";
import ManualStoreReportForm from "@/components/reports/ManualStoreReportForm";
import StorePreviewModal from "@/components/store/StorePreviewModal";

/* -------------------------------------------------------------------------- */
/*                               Helper Types                                 */
/* -------------------------------------------------------------------------- */

type StoreTab = "records" | "pricing" | "operations" | "suppliers";

type NewSupplierForm = {
  name: string;
  phone: string;
  origin: string;
  opening_balance: number;
};

type NewRecordForm = {
  coffeeType: string;
  date: string;
  kilograms: string;
  bags: string;
  supplierName: string;
  batchNumber: string;
  status: string;
};

type EditRecordForm = {
  coffeeType: string;
  date: string;
  kilograms: string;
  bags: string;
  supplierName: string;
  batchNumber: string;
};

type StatusKey =
  | "pending"
  | "quality_review"
  | "pricing"
  | "batched"
  | "drying"
  | "sales"
  | "inventory"
  | "rejected"
  | "submitted_to_finance"
  | "assessed"
  | "paid"
  | string;

type StatusConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
};

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return "";

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
  }

  return dateStr;
};

const getStatusBadge = (status: StatusKey): StatusConfig => {
  const config: Record<StatusKey, StatusConfig> = {
    pending: { label: "Pending", variant: "secondary" },
    quality_review: { label: "Quality Review", variant: "default" },
    pricing: { label: "Pricing", variant: "default" },
    batched: { label: "Batched", variant: "default" },
    drying: { label: "Drying", variant: "default" },
    sales: { label: "Sales Ready", variant: "default" },
    inventory: { label: "In Inventory", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    submitted_to_finance: {
      label: "Submitted to Finance",
      variant: "default",
    },
    assessed: { label: "Assessed", variant: "default" },
    paid: { label: "Paid", variant: "default" },
  };

  return config[status] || config["pending"];
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const Store = () => {
  const [searchParams] = useSearchParams();

  const initialTabParam = searchParams.get("tab");
  const initialTab: StoreTab =
    initialTabParam === "pricing" || initialTabParam === "operations" || initialTabParam === "suppliers"
      ? initialTabParam
      : "records";

  /* ----------------------------- Data from hooks ----------------------------- */

  const {
    coffeeRecords,
    loading: storeLoading,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    updateCoffeeRecord,
    deleteCoffeeRecord,
  } = useStoreManagement();

  const { suppliers, loading: suppliersLoading, addSupplier } = useSuppliers();

  const { qualityAssessments, loading: qualityLoading } = useQualityControl();

  const { processingBatches, machines, loading: processingLoading, todayMetrics } = useProcessingOperations();

  const { hasPermission, isAdmin } = useAuth();

  const loading = storeLoading || suppliersLoading || qualityLoading || processingLoading;

  /* ------------------------------- Local state ------------------------------- */

  const [activeTab, setActiveTab] = useState<StoreTab>(initialTab);

  // Supplier form
  const [newSupplier, setNewSupplier] = useState<NewSupplierForm>({
    name: "",
    phone: "",
    origin: "",
    opening_balance: 0,
  });
  const [submittingSupplier, setSubmittingSupplier] = useState(false);

  // New record form
  const [newRecord, setNewRecord] = useState<NewRecordForm>({
    coffeeType: "",
    date: new Date().toISOString().split("T")[0],
    kilograms: "",
    bags: "",
    supplierName: "",
    batchNumber: `BATCH${Date.now()}`,
    status: "pending",
  });
  const [submittingRecord, setSubmittingRecord] = useState(false);

  // Edit record
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<EditRecordForm>({
    coffeeType: "",
    date: "",
    kilograms: "",
    bags: "",
    supplierName: "",
    batchNumber: "",
  });

  // Date filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [assessmentSelectedDate, setAssessmentSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Modals
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedGRNData, setSelectedGRNData] = useState<any | null>(null);
  const [showQuickReportModal, setShowQuickReportModal] = useState(false);
  const [showStorePreviewModal, setShowStorePreviewModal] = useState(false);

  /* ------------------------ URL → Tab Sync (react-router) -------------------- */

  useEffect(() => {
    const tabParam = searchParams.get("tab") as StoreTab | null;
    if (tabParam && ["records", "pricing", "operations", "suppliers"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  /* ---------------------- Filtered data & grouped data ---------------------- */

  const filteredRecords = useMemo(
    () =>
      coffeeRecords.filter((record: any) => {
        const recordDate = normalizeDate(record.date);
        const filterDate = normalizeDate(selectedDate);
        return recordDate === filterDate;
      }),
    [coffeeRecords, selectedDate],
  );

  const filteredAssessments = useMemo(
    () =>
      qualityAssessments.filter((assessment: any) => {
        const assessmentDate = normalizeDate(assessment.date_assessed);
        const filterDate = normalizeDate(assessmentSelectedDate);
        return assessmentDate === filterDate;
      }),
    [qualityAssessments, assessmentSelectedDate],
  );

  const groupedAssessments = useMemo(() => {
    return qualityAssessments.reduce((groups: Record<string, any[]>, assessment: any) => {
      const date = normalizeDate(assessment.date_assessed);
      if (!groups[date]) groups[date] = [];
      groups[date].push(assessment);
      return groups;
    }, {});
  }, [qualityAssessments]);

  const sortedDates = useMemo(
    () => Object.keys(groupedAssessments).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    [groupedAssessments],
  );

  /* ------------------------- Supplier autocomplete data ------------------------ */

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier: any) => ({
        value: supplier.name,
        label: supplier.name,
        subtitle: supplier.phone,
      })),
    [suppliers],
  );

  /* -------------------------------------------------------------------------- */
  /*                               Event Handlers                               */
  /* -------------------------------------------------------------------------- */

  const handleSaveSupplier = async () => {
    if (!newSupplier.name || !newSupplier.origin) {
      toast.error("Please fill in required fields");
      return;
    }

    setSubmittingSupplier(true);
    try {
      await addSupplier(newSupplier);
      setNewSupplier({
        name: "",
        phone: "",
        origin: "",
        opening_balance: 0,
      });
      toast.success("Supplier registered successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to register supplier");
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const handleSubmitRecord = async (keepOpen = false) => {
    const { coffeeType, supplierName, kilograms, bags } = newRecord;

    if (!coffeeType || !supplierName || !kilograms || !bags || Number(kilograms) <= 0 || Number(bags) <= 0) {
      toast.error("Please fill in all required fields");
      return false;
    }

    setSubmittingRecord(true);
    try {
      await addCoffeeRecord({
        ...newRecord,
        kilograms: Number(newRecord.kilograms),
        bags: Number(newRecord.bags),
        batchNumber: `BATCH${Date.now()}`,
      });

      setNewRecord({
        coffeeType: "",
        date: new Date().toISOString().split("T")[0],
        kilograms: "",
        bags: "",
        supplierName: "",
        batchNumber: "",
        status: "pending",
      });

      toast.success("Coffee record submitted successfully");

      if (!keepOpen) {
        setShowAddRecordModal(false);
      }
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit coffee record");
      return false;
    } finally {
      setSubmittingRecord(false);
    }
  };

  const handleStatusUpdate = async (recordId: string, newStatus: StatusKey) => {
    try {
      await updateCoffeeRecordStatus(recordId, newStatus);
      toast.success("Status updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setEditFormData({
      coffeeType: record.coffeeType,
      date: normalizeDate(record.date),
      kilograms: record.kilograms.toString(),
      bags: record.bags.toString(),
      supplierName: record.supplierName,
      batchNumber: record.batchNumber,
    });
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;

    try {
      await updateCoffeeRecord(editingRecord.id, {
        ...editFormData,
        kilograms: Number(editFormData.kilograms),
        bags: Number(editFormData.bags),
      });
      setEditingRecord(null);
      toast.success("Record updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update record");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteCoffeeRecord(recordId);
      toast.success("Record deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete record");
    }
  };

  const canEditOrDelete = (record: any) => record.status !== "sales" && record.status !== "inventory";

  const handlePrintGRN = (record: any) => {
    const qualityAssessment = qualityAssessments.find((qa: any) => qa.batch_number === record.batchNumber);

    const grnData = {
      grnNumber: record.batchNumber,
      supplierName: record.supplierName,
      coffeeType: record.coffeeType,
      qualityAssessment: qualityAssessment ? "Assessed" : "Pending Assessment",
      numberOfBags: record.bags,
      totalKgs: record.kilograms,
      unitPrice: qualityAssessment?.suggested_price || 0,
      assessedBy: qualityAssessment?.assessed_by || "N/A",
      createdAt: record.date,
      moisture: qualityAssessment?.moisture,
      group1_defects: qualityAssessment?.group1_defects,
      group2_defects: qualityAssessment?.group2_defects,
      below12: qualityAssessment?.below12,
      pods: qualityAssessment?.pods,
      husks: qualityAssessment?.husks,
      stones: qualityAssessment?.stones,
    };

    setSelectedGRNData(grnData);
    setShowGRNModal(true);
  };

  const handlePrintAllRecords = () => {
    const printContent = filteredRecords.map((record: any) => {
      const qualityAssessment = qualityAssessments.find((qa: any) => qa.batch_number === record.batchNumber);

      const unitPrice = qualityAssessment?.suggested_price || 0;
      return {
        ...record,
        qualityAssessment,
        unitPrice,
        totalAmount: unitPrice * record.kilograms,
      };
    });

    const printWindow = window.open("", "", "width=1200,height=800");
    if (!printWindow) return;

    const filterDateFormatted = new Date(selectedDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Coffee Records - ${filterDateFormatted} - Great Pearl Coffee Factory</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .report-date { font-size: 14px; color: #666; margin-bottom: 5px; }
            .filter-date { font-size: 16px; font-weight: bold; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">GREAT PEARL COFFEE FACTORY</div>
            <div class="report-date">Coffee Records Report - Generated on ${new Date().toLocaleDateString()}</div>
            <div class="filter-date">Records for: ${filterDateFormatted}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Date</th>
                <th>Coffee Type</th>
                <th>Supplier</th>
                <th>Bags</th>
                <th>Kilograms</th>
                <th>Unit Price (UGX)</th>
                <th>Total Amount (UGX)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${printContent
                .map(
                  (record) => `
                <tr>
                  <td>${record.batchNumber}</td>
                  <td>${record.date}</td>
                  <td>${record.coffeeType}</td>
                  <td>${record.supplierName}</td>
                  <td>${record.bags}</td>
                  <td>${Number(record.kilograms).toLocaleString()}kg</td>
                  <td>${record.unitPrice.toLocaleString()}</td>
                  <td>${record.totalAmount.toLocaleString()}</td>
                  <td>${record.status}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td colspan="4">TOTALS</td>
                <td>${printContent.reduce((sum, r) => sum + Number(r.bags), 0)}</td>
                <td>${printContent.reduce((sum, r) => sum + Number(r.kilograms), 0).toLocaleString()}kg</td>
                <td>-</td>
                <td>${printContent.reduce((sum, r) => sum + Number(r.totalAmount), 0).toLocaleString()}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  /* -------------------------------------------------------------------------- */
  /*                         Permissions & Loading states                       */
  /* -------------------------------------------------------------------------- */

  if (!hasPermission("Store Management")) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Package className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don&apos;t have permission to access Store Management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="Store Management" subtitle="Manage suppliers and coffee inventory records">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading store data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                    UI                                      */
  /* -------------------------------------------------------------------------- */

  return (
    <Layout title="Store Management" subtitle="Manage suppliers and coffee inventory records">
      <div className="space-y-6">
        {/* Header row: ticker + quick actions */}
        <div className="flex justify-between items-center">
          <PriceTicker />
          <div className="flex gap-2">
            <Button onClick={() => setShowStorePreviewModal(true)} className="gap-2" size="sm" variant="outline">
              <Eye className="h-4 w-4" />
              Store Preview
            </Button>
            <Button onClick={() => setShowQuickReportModal(true)} className="gap-2" size="sm">
              <FileText className="h-4 w-4" />
              Quick Add Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as StoreTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="records" className="text-xs sm:text-sm">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Coffee </span>Records
            </TabsTrigger>

            <TabsTrigger value="pricing" className="text-xs sm:text-sm">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Pricing</span>
              <span className="xs:hidden">Price</span>
            </TabsTrigger>

            <TabsTrigger value="operations" className="text-xs sm:text-sm">
              <Scale className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Operations
            </TabsTrigger>

            <TabsTrigger value="suppliers" className="text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Supplier </span>Suppliers
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------------ */}
          {/*                            Coffee Records                         */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Coffee Records</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {coffeeRecords.length > 0
                        ? `${coffeeRecords.length} coffee delivery records in the system`
                        : "No coffee records yet. Add your first delivery record below."}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Button onClick={() => setShowAddRecordModal(true)} className="text-xs sm:text-sm" size="sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Add Coffee Delivery Record</span>
                      <span className="sm:hidden">Add Record</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintAllRecords}
                      disabled={filteredRecords.length === 0}
                      className="text-xs sm:text-sm"
                    >
                      <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Print Records
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 sm:p-6">
                {/* Date Filter */}
                <div className="mb-4 flex flex-col xs:flex-row items-start xs:items-center gap-2">
                  <Label htmlFor="date-filter" className="text-xs sm:text-sm whitespace-nowrap">
                    View Records for:
                  </Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full xs:w-auto text-xs sm:text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                    className="w-full xs:w-auto text-xs sm:text-sm"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Today
                  </Button>
                </div>

                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">
                      No coffee records found for {new Date(selectedDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs sm:text-sm mt-2">Select a different date to view other records</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Total records in system: {coffeeRecords.length}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Batch Number</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Coffee Type</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Supplier</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Kilograms</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Bags</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record: any) => {
                          const statusInfo = getStatusBadge(record.status as StatusKey);
                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                                {record.batchNumber}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">{record.date}</TableCell>
                              <TableCell className="capitalize text-xs sm:text-sm whitespace-nowrap">
                                {record.coffeeType}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                {record.supplierName}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                {Number(record.kilograms).toLocaleString()}kg
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{record.bags}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant={statusInfo.variant} className="text-xs">
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex gap-1 sm:gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrintGRN(record)}
                                    className="text-xs px-2"
                                  >
                                    <Printer className="h-3 w-3 sm:mr-1" />
                                    <span className="hidden sm:inline">GRN</span>
                                  </Button>

                                  {canEditOrDelete(record) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditRecord(record)}
                                        className="px-2"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="px-2">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle className="text-base sm:text-lg">
                                              Delete Coffee Record
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-xs sm:text-sm">
                                              Are you sure you want to delete this coffee record? This action cannot be
                                              undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="flex-col xs:flex-row gap-2">
                                            <AlertDialogCancel className="text-xs sm:text-sm">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteRecord(record.id)}
                                              className="text-xs sm:text-sm"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------------ */}
          {/*                      Pricing / Quality Assessments                 */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Quality Assessments & Pricing</CardTitle>
                    <CardDescription>
                      {qualityAssessments.length > 0
                        ? `${qualityAssessments.length} quality assessments in the system`
                        : "No quality assessments yet. Coffee records must be assessed first."}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="assessment-date-filter">Filter by Date:</Label>
                    <Input
                      id="assessment-date-filter"
                      type="date"
                      value={assessmentSelectedDate}
                      onChange={(e) => setAssessmentSelectedDate(e.target.value)}
                      className="w-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssessmentSelectedDate(new Date().toISOString().split("T")[0])}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {filteredAssessments.length > 0 ? (
                  <div className="space-y-6">
                    <div className="border rounded-lg">
                      <div className="bg-muted px-4 py-2 font-semibold">
                        {new Date(assessmentSelectedDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Coffee Type</TableHead>
                            <TableHead>Kilograms</TableHead>
                            <TableHead>Suggested Price</TableHead>
                            <TableHead>Total Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assessed By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAssessments.map((assessment: any) => (
                            <TableRow key={assessment.id}>
                              <TableCell className="font-mono">{assessment.batch_number}</TableCell>
                              <TableCell>{assessment.supplier_name || "N/A"}</TableCell>
                              <TableCell className="capitalize">{assessment.coffee_type || "N/A"}</TableCell>
                              <TableCell>
                                {Number(assessment.kilograms || 0).toLocaleString()}
                                kg
                              </TableCell>
                              <TableCell>UGX {assessment.suggested_price.toLocaleString()}/kg</TableCell>
                              <TableCell>
                                <span className="font-semibold">
                                  UGX {((assessment.kilograms || 0) * assessment.suggested_price).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={assessment.status === "submitted_to_finance" ? "default" : "secondary"}>
                                  {String(assessment.status).replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>{assessment.assessed_by}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="bg-muted/50 px-4 py-3 border-t">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Daily Total:</span>
                          <span className="text-lg">
                            UGX{" "}
                            {filteredAssessments
                              .reduce((sum: number, a: any) => sum + (a.kilograms || 0) * a.suggested_price, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {filteredAssessments.length} assessments •{" "}
                          {filteredAssessments
                            .reduce((sum: number, a: any) => sum + (a.kilograms || 0), 0)
                            .toLocaleString()}
                          kg total
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No quality assessments for {new Date(assessmentSelectedDate).toLocaleDateString()}</p>
                    <p className="text-sm">Try selecting a different date</p>
                  </div>
                )}

                {/* All Assessments Grouped by Date */}
                {qualityAssessments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">All Assessments by Date</h3>
                    <div className="space-y-4">
                      {sortedDates.map((date) => {
                        const dayAssessments = groupedAssessments[date] || [];
                        const dayTotal = dayAssessments.reduce(
                          (sum: number, a: any) => sum + (a.kilograms || 0) * a.suggested_price,
                          0,
                        );
                        const dayKg = dayAssessments.reduce((sum: number, a: any) => sum + (a.kilograms || 0), 0);

                        return (
                          <div key={date} className="border rounded-lg">
                            <div
                              className="bg-muted px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-muted/80"
                              onClick={() => setAssessmentSelectedDate(normalizeDate(date))}
                            >
                              <span className="font-semibold">
                                {new Date(date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <div className="flex gap-4 text-sm">
                                <span>{dayAssessments.length} assessments</span>
                                <span>{dayKg.toLocaleString()}kg</span>
                                <span className="font-semibold">UGX {dayTotal.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------------ */}
          {/*                              Operations                             */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="operations" className="space-y-6">
            {/* Processing Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayMetrics.processedBags.toLocaleString()} kg</div>
                  <p className="text-xs text-muted-foreground">Total output</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                  <Factory className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayMetrics.averageEfficiency}%</div>
                  <p className="text-xs text-muted-foreground">Machine performance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Output Rate</CardTitle>
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayMetrics.outputRate}%</div>
                  <p className="text-xs text-muted-foreground">Input to output</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayMetrics.averageProcessingTime.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">Per batch</p>
                </CardContent>
              </Card>
            </div>

            {/* Processing Batches */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Batches</CardTitle>
                <CardDescription>
                  {processingBatches.length > 0
                    ? `${processingBatches.length} batches currently in processing`
                    : "No processing batches yet. Processing operations will appear here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingBatches.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Input Weight</TableHead>
                        <TableHead>Output Weight</TableHead>
                        <TableHead>Efficiency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Operator</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processingBatches.map((batch: any) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono">{batch.batchNumber}</TableCell>
                          <TableCell className="capitalize">{batch.coffeeType}</TableCell>
                          <TableCell>{batch.processingStage}</TableCell>
                          <TableCell>{batch.inputWeight.toLocaleString()}kg</TableCell>
                          <TableCell>{batch.outputWeight.toLocaleString()}kg</TableCell>
                          <TableCell>
                            <Badge variant={batch.efficiency >= 90 ? "default" : "secondary"}>
                              {batch.efficiency}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={batch.status === "Completed" ? "default" : "secondary"}>
                              {batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.operatorName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No processing batches available</p>
                    <p className="text-sm">Processing operations will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Machine Status */}
            <Card>
              <CardHeader>
                <CardTitle>Machine Status</CardTitle>
                <CardDescription>
                  {machines.length > 0 ? `${machines.length} machines in the system` : "No machines registered yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {machines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Efficiency</TableHead>
                        <TableHead>Current Batch</TableHead>
                        <TableHead>Last Maintenance</TableHead>
                        <TableHead>Next Maintenance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machines.map((machine: any) => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-medium">{machine.machineName}</TableCell>
                          <TableCell>{machine.type}</TableCell>
                          <TableCell>
                            <Badge variant={machine.status === "Operational" ? "default" : "destructive"}>
                              {machine.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={machine.efficiency >= 90 ? "default" : "secondary"}>
                              {machine.efficiency}%
                            </Badge>
                          </TableCell>
                          <TableCell>{machine.currentBatch || "N/A"}</TableCell>
                          <TableCell>{new Date(machine.lastMaintenance).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(machine.nextMaintenance).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No machines available</p>
                    <p className="text-sm">Machine status will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------------ */}
          {/*                               Suppliers                            */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Supplier Management</CardTitle>
                    <CardDescription>
                      {suppliers.length > 0
                        ? `${suppliers.length} suppliers registered in the system`
                        : "No suppliers registered yet. Add your first supplier below."}
                    </CardDescription>
                  </div>

                  {isAdmin() ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Supplier
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Register New Supplier</DialogTitle>
                          <DialogDescription>Add a new coffee supplier to the system</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="supplier-name">Supplier Name *</Label>
                              <Input
                                id="supplier-name"
                                value={newSupplier.name}
                                onChange={(e) =>
                                  setNewSupplier((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="Enter supplier name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="supplier-phone">Phone Number</Label>
                              <Input
                                id="supplier-phone"
                                value={newSupplier.phone}
                                onChange={(e) =>
                                  setNewSupplier((prev) => ({
                                    ...prev,
                                    phone: e.target.value,
                                  }))
                                }
                                placeholder="+256..."
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="supplier-origin">Origin *</Label>
                              <Input
                                id="supplier-origin"
                                value={newSupplier.origin}
                                onChange={(e) =>
                                  setNewSupplier((prev) => ({
                                    ...prev,
                                    origin: e.target.value,
                                  }))
                                }
                                placeholder="e.g., Mount Elgon"
                              />
                            </div>
                            <div>
                              <Label htmlFor="opening-balance">Opening Balance (UGX)</Label>
                              <Input
                                id="opening-balance"
                                type="number"
                                value={newSupplier.opening_balance}
                                onChange={(e) =>
                                  setNewSupplier((prev) => ({
                                    ...prev,
                                    opening_balance: Number(e.target.value),
                                  }))
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button onClick={handleSaveSupplier} disabled={submittingSupplier}>
                            {submittingSupplier ? "Saving..." : "Save Supplier"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Only admins can add suppliers
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {suppliers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Opening Balance</TableHead>
                        <TableHead>Date Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier: any) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-mono">{supplier.code}</TableCell>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.origin}</TableCell>
                          <TableCell>{supplier.phone || "N/A"}</TableCell>
                          <TableCell>UGX {Number(supplier.opening_balance).toLocaleString()}</TableCell>
                          <TableCell>{supplier.date_registered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No suppliers registered yet</p>
                    <p className="text-sm">Click &quot;Add Supplier&quot; to register your first supplier</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* -------------------------------------------------------------------- */}
        {/*                           Edit Record Modal                          */}
        {/* -------------------------------------------------------------------- */}
        <Dialog
          open={!!editingRecord}
          onOpenChange={(open) => {
            if (!open) setEditingRecord(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Coffee Record</DialogTitle>
              <DialogDescription>Update the coffee delivery record details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-coffee-type">Coffee Type</Label>
                  <Select
                    value={editFormData.coffeeType}
                    onValueChange={(value) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        coffeeType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabica">Arabica</SelectItem>
                      <SelectItem value="robusta">Robusta</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormData.date}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-kilograms">Kilograms</Label>
                  <Input
                    id="edit-kilograms"
                    type="number"
                    value={editFormData.kilograms}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        kilograms: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bags">Bags</Label>
                  <Input
                    id="edit-bags"
                    type="number"
                    value={editFormData.bags}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        bags: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Select
                  value={editFormData.supplierName}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      supplierName: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRecord}>Update Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* -------------------------------------------------------------------- */}
        {/*                     Add Coffee Delivery Record Modal                  */}
        {/* -------------------------------------------------------------------- */}
        <Dialog open={showAddRecordModal} onOpenChange={setShowAddRecordModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Add Coffee Delivery Record</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Record new coffee delivery from suppliers
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coffee-type">Coffee Type *</Label>
                  <Select
                    value={newRecord.coffeeType}
                    onValueChange={(value) =>
                      setNewRecord((prev) => ({
                        ...prev,
                        coffeeType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coffee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabica">Arabica</SelectItem>
                      <SelectItem value="robusta">Robusta</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supplier-name">Supplier Name *</Label>
                  <Autocomplete
                    options={supplierOptions}
                    value={newRecord.supplierName}
                    onValueChange={(value) =>
                      setNewRecord((prev) => ({
                        ...prev,
                        supplierName: value,
                      }))
                    }
                    placeholder="Search supplier..."
                    searchPlaceholder="Type to search..."
                    emptyText="No suppliers found"
                  />
                </div>

                <div>
                  <Label htmlFor="delivery-date">Delivery Date *</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={newRecord.date}
                    onChange={(e) =>
                      setNewRecord((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="kilograms">Kilograms *</Label>
                  <Input
                    id="kilograms"
                    type="number"
                    value={newRecord.kilograms}
                    onChange={(e) =>
                      setNewRecord((prev) => ({
                        ...prev,
                        kilograms: e.target.value,
                      }))
                    }
                    placeholder="Enter weight in kg"
                  />
                </div>

                <div>
                  <Label htmlFor="bags">Number of Bags *</Label>
                  <Input
                    id="bags"
                    type="number"
                    value={newRecord.bags}
                    onChange={(e) =>
                      setNewRecord((prev) => ({
                        ...prev,
                        bags: e.target.value,
                      }))
                    }
                    placeholder="Enter number of bags"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col xs:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddRecordModal(false)}
                className="text-xs sm:text-sm w-full xs:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSubmitRecord(true)}
                disabled={submittingRecord}
                className="text-xs sm:text-sm w-full xs:w-auto"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {submittingRecord ? "Saving..." : "Save & Add Another"}
              </Button>
              <Button
                onClick={() => handleSubmitRecord(false)}
                disabled={submittingRecord}
                className="text-xs sm:text-sm w-full xs:w-auto"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {submittingRecord ? "Saving..." : "Save & Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* -------------------------------------------------------------------- */}
        {/*                          Quick Report Modal                          */}
        {/* -------------------------------------------------------------------- */}
        <Dialog open={showQuickReportModal} onOpenChange={setShowQuickReportModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quick Add Store Report</DialogTitle>
              <DialogDescription>
                Add a report with document scanning. This allows you to input reports without accessing the full reports
                section.
              </DialogDescription>
            </DialogHeader>
            <ManualStoreReportForm />
          </DialogContent>
        </Dialog>

        {/* -------------------------------------------------------------------- */}
        {/*                          Store Preview Modal                         */}
        {/* -------------------------------------------------------------------- */}
        <StorePreviewModal open={showStorePreviewModal} onOpenChange={setShowStorePreviewModal} />

        {/* -------------------------------------------------------------------- */}
        {/*                           GRN Print Modal                            */}
        {/* -------------------------------------------------------------------- */}
        <GRNPrintModal open={showGRNModal} onClose={() => setShowGRNModal(false)} grnData={selectedGRNData} />
      </div>
    </Layout>
  );
};

export default Store;
