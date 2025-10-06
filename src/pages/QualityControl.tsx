import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Scale, 
  Droplets, 
  AlertTriangle,
  FileText,
  TrendingUp,
  Eye,
  Send,
  Factory,
  FileDown,
  Edit,
  RefreshCw,
  Loader2,
  Calculator,
  Edit3
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQualityControl } from "@/hooks/useQualityControl";
import { useWorkflowTracking } from "@/hooks/useWorkflowTracking";
import { usePrices } from "@/contexts/PriceContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleBasedAccess } from "@/hooks/useRoleBasedAccess";
import GRNPrintModal from "@/components/quality/GRNPrintModal";
import ArabicaPriceCalculator from "@/components/milling/ArabicaPriceCalculator";
import QualityAssessmentReports from "@/components/quality/QualityAssessmentReports";
const QualityControl = () => {
  const {
    storeRecords,
    qualityAssessments,
    pendingRecords,
    loading,
    error,
    addQualityAssessment,
    updateStoreRecord,
    submitToFinance,
    refreshData
  } = useQualityControl();

  const { 
    modificationRequests,
    getPendingModificationRequests,
    completeModificationRequest,
    trackWorkflowStep,
    loading: workflowLoading,
    refetch: refetchWorkflow
  } = useWorkflowTracking();

  const { prices, refreshPrices } = usePrices();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const access = useRoleBasedAccess();
  const readOnly = !access.canManageQuality;
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    // Quality parameters from calculator
    moisture: '',
    group1_defects: '',
    group2_defects: '',
    below12: '',
    pods: '',
    husks: '',
    stones: '',
    discretion: '',
    ref_price: '',
    
    // Calculated results from calculator
    fm: 0,
    actual_ott: 0,
    clean_d14: 0,
    outturn: 0,
    outturn_price: 0,
    final_price: 0,
    quality_note: '',
    reject_outturn_price: false,
    reject_final: false,
    
    // Manual override and comments
    manual_price: '',
    comments: '',
    use_manual_price: false  // Toggle between calculator and manual price
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grnPrintModal, setGrnPrintModal] = useState<{
    open: boolean;
    grnData: {
      grnNumber: string;
      supplierName: string;
      coffeeType: string;
      qualityAssessment: string;
      numberOfBags: number;
      totalKgs: number;
      unitPrice: number;
      assessedBy: string;
      createdAt: string;
      moisture?: number;
      group1_defects?: number;
      group2_defects?: number;
      below12?: number;
      pods?: number;
      husks?: number;
      stones?: number;
    } | null;
  }>({
    open: false,
    grnData: null
  });

  // Get pending modification requests for quality department
  const pendingModificationRequests = getPendingModificationRequests('Quality');

  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      try {
        if (isMounted) {
          await refreshPrices();
          await refetchWorkflow();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent multiple refreshes
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshData(),
        refetchWorkflow()
      ]);
      toast({
        title: "Success",
        description: "Data refreshed successfully"
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartAssessment = (record: any) => {
    console.log('Starting assessment for record:', record);
    if (readOnly) {
      toast({
        title: 'View-only mode',
        description: "You can't perform Quality tasks. You may view and approve only.",
        variant: 'destructive'
      });
      return;
    }
    setSelectedRecord(record);
    setAssessmentForm({
      moisture: '',
      group1_defects: '',
      group2_defects: '',
      below12: '',
      pods: '',
      husks: '',
      stones: '',
      discretion: '',
      ref_price: '',
      fm: 0,
      actual_ott: 0,
      clean_d14: 0,
      outturn: 0,
      outturn_price: 0,
      final_price: 0,
      quality_note: '',
      reject_outturn_price: false,
      reject_final: false,
      manual_price: '',
      comments: '',
      use_manual_price: false
    });
    setActiveTab("price-calculator");
  };

  const handleStartModification = async (modificationRequest: any) => {
    console.log('Starting modification for request:', modificationRequest);
    if (readOnly) {
      toast({
        title: 'View-only mode',
        description: "You can't perform Quality tasks. You may view and approve only.",
        variant: 'destructive'
      });
      return;
    }
    console.log('Available store records:', storeRecords);
    console.log('Available quality assessments:', qualityAssessments);
    
    // First, try to find the record by batch number
    let originalRecord = storeRecords.find(record => 
      record.batch_number === modificationRequest.batchNumber
    );
    
    // If not found by batch number, try by original payment ID
    if (!originalRecord) {
      originalRecord = storeRecords.find(record => 
        record.id === modificationRequest.originalPaymentId
      );
    }
    
    // If still not found, try to find by quality assessment ID
    if (!originalRecord && modificationRequest.qualityAssessmentId) {
      const qualityAssessment = qualityAssessments.find(qa => 
        qa.id === modificationRequest.qualityAssessmentId
      );
      
      if (qualityAssessment) {
        originalRecord = storeRecords.find(record => 
          record.id === qualityAssessment.store_record_id
        );
      }
    }
    
    // If still not found, refresh data and try again
    if (!originalRecord) {
      console.log('Record not found, refreshing data and trying again...');
      try {
        await refreshData();
        
        // Try searching again after refresh
        originalRecord = storeRecords.find(record => 
          record.batch_number === modificationRequest.batchNumber ||
          record.id === modificationRequest.originalPaymentId
        );
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
    
    if (!originalRecord) {
      console.error('Original record not found for modification request:', modificationRequest);
      console.error('Searched for batch_number:', modificationRequest.batchNumber);
      console.error('Searched for originalPaymentId:', modificationRequest.originalPaymentId);
      console.error('Available records:', storeRecords.map(r => ({ id: r.id, batch_number: r.batch_number })));
      
      toast({
        title: "Error",
        description: `Cannot find the original coffee record for batch ${modificationRequest.batchNumber || 'N/A'}. Please refresh the page and try again.`,
        variant: "destructive"
      });
      return;
    }
    
    console.log('Found original record:', originalRecord);
    
    setSelectedRecord({
      ...originalRecord,
      isModification: true,
      modificationRequestId: modificationRequest.id,
      modificationReason: modificationRequest.reason
    });
    
    setAssessmentForm({
      moisture: '',
      group1_defects: '',
      group2_defects: '',
      below12: '',
      pods: '',
      husks: '',
      stones: '',
      discretion: '',
      ref_price: '',
      fm: 0,
      actual_ott: 0,
      clean_d14: 0,
      outturn: 0,
      outturn_price: 0,
      final_price: 0,
      quality_note: '',
      reject_outturn_price: false,
      reject_final: false,
      manual_price: '',
      comments: `Modification requested due to: ${modificationRequest.reason}${modificationRequest.comments ? '. Additional notes: ' + modificationRequest.comments : ''}`,
      use_manual_price: false
    });
    
    setActiveTab("price-calculator");
    
    toast({
      title: "Modification Started",
      description: `Starting quality modification for batch ${originalRecord.batch_number}`,
    });
  };

  const calculateSuggestedPrice = () => {
    if (!selectedRecord) return 0;
    
    let basePrice = 0;
    const coffeeType = selectedRecord.coffee_type?.toLowerCase();
    
    if (coffeeType?.includes('arabica') || coffeeType?.includes('drugar')) {
      basePrice = prices.drugarLocal;
    } else if (coffeeType?.includes('robusta')) {
      basePrice = prices.robustaFaqLocal;
    } else {
      basePrice = prices.drugarLocal;
    }
    
    const moisture = parseFloat(assessmentForm.moisture) || 12;
    const group1 = parseFloat(assessmentForm.group1_defects) || 0;
    const group2 = parseFloat(assessmentForm.group2_defects) || 0;
    
    let adjustment = 1.0;
    
    if (moisture > 12) {
      adjustment -= (moisture - 12) * 0.02;
    } else if (moisture < 10) {
      adjustment -= (10 - moisture) * 0.03;
    }
    
    adjustment -= (group1 * 0.05);
    adjustment -= (group2 * 0.02);
    
    adjustment = Math.max(adjustment, 0.5);
    
    const suggestedPrice = Math.round(basePrice * adjustment * selectedRecord.kilograms);
    
    return suggestedPrice;
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    if (readOnly) {
      toast({
        title: 'View-only mode',
        description: "You can't perform Quality tasks. You may view and approve only.",
        variant: 'destructive'
      });
      return;
    }
    if (!selectedRecord) {
      toast({
        title: "Error",
        description: "No record selected for assessment",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!assessmentForm.moisture || parseFloat(assessmentForm.moisture) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid moisture percentage.",
        variant: "destructive"
      });
      return;
    }

    // Prioritize manual price if entered, otherwise use calculator price
    const manualPriceValue = parseFloat(assessmentForm.manual_price);
    const calculatorPrice = assessmentForm.final_price || calculateSuggestedPrice();
    
    // Use manual price if it's a valid number greater than 0, otherwise use calculator
    const finalPrice = (manualPriceValue && manualPriceValue > 0) 
      ? manualPriceValue 
      : calculatorPrice;
    
    if (finalPrice <= 0) {
      toast({
        title: "Error",
        description: "Please either enter a manual price or calculate a price using the calculator.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting quality assessment...');
      console.log('Selected record:', selectedRecord);
      console.log('Assessment form data:', assessmentForm);
      
      const assessment = {
        store_record_id: selectedRecord.id,
        batch_number: selectedRecord.batch_number || `BATCH-${Date.now()}`,
        // Quality parameters
        moisture: parseFloat(assessmentForm.moisture) || 0,
        group1_defects: parseFloat(assessmentForm.group1_defects) || 0,
        group2_defects: parseFloat(assessmentForm.group2_defects) || 0,
        below12: parseFloat(assessmentForm.below12) || 0,
        pods: parseFloat(assessmentForm.pods) || 0,
        husks: parseFloat(assessmentForm.husks) || 0,
        stones: parseFloat(assessmentForm.stones) || 0,
        discretion: parseFloat(assessmentForm.discretion) || 0,
        ref_price: parseFloat(assessmentForm.ref_price) || 0,
        // Calculated results from Arabica Price Calculator
        fm: Number(assessmentForm.fm) || 0,
        actual_ott: Number(assessmentForm.actual_ott) || 0,
        clean_d14: Number(assessmentForm.clean_d14) || 0,
        outturn: Number(assessmentForm.outturn) || 0,
        outturn_price: Number(assessmentForm.outturn_price) || 0,
        final_price: finalPrice, // Use the determined final price (calculator or manual)
        quality_note: assessmentForm.quality_note || '',
        reject_outturn_price: Boolean(assessmentForm.reject_outturn_price),
        reject_final: Boolean(assessmentForm.reject_final),
        // Final values - suggested_price stores the final price to be paid
        suggested_price: finalPrice,
        status: 'assessed' as const,
        comments: assessmentForm.comments || '',
        date_assessed: new Date().toISOString().split('T')[0],
        assessed_by: 'Quality Controller',
      };

      console.log('Final assessment data to submit:', assessment);
      
      const result = await addQualityAssessment(assessment);
      console.log('Assessment submission result:', result);
      
      if (selectedRecord.isModification) {
        await completeModificationRequest(selectedRecord.modificationRequestId);
        
        await trackWorkflowStep({
          paymentId: selectedRecord.id,
          qualityAssessmentId: assessment.store_record_id,
          fromDepartment: 'Quality',
          toDepartment: 'Finance',
          action: 'modified',
          reason: 'quality_reassessment',
          comments: `Quality reassessment completed. New price: ${finalPrice}`,
          processedBy: 'Quality Controller',
          status: 'completed'
        });
      }
      
      await updateStoreRecord(selectedRecord.id, { status: 'assessed' });
      
      setSelectedRecord(null);
      setAssessmentForm({
        moisture: '',
        group1_defects: '',
        group2_defects: '',
        below12: '',
        pods: '',
        husks: '',
        stones: '',
        discretion: '',
        ref_price: '',
        fm: 0,
        actual_ott: 0,
        clean_d14: 0,
        outturn: 0,
        outturn_price: 0,
        final_price: 0,
        quality_note: '',
        reject_outturn_price: false,
        reject_final: false,
        manual_price: '',
        comments: '',
        use_manual_price: false
      });
      setActiveTab("assessments");
      
      toast({
        title: "Assessment Complete",
        description: selectedRecord.isModification 
          ? "Quality reassessment completed and sent back to finance"
          : "Quality assessment saved and sent to finance for payment processing"
      });
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to submit quality assessment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitToFinance = async (assessmentId: string) => {
    if (readOnly) {
      toast({
        title: 'View-only mode',
        description: "You can't perform Quality tasks. You may view and approve only.",
        variant: 'destructive'
      });
      return;
    }
    try {
      await submitToFinance(assessmentId);
    } catch (error) {
      console.error('Error submitting to finance:', error);
    }
  };

  const handleSendToDrier = async (assessmentId: string) => {
    if (readOnly) {
      toast({
        title: 'View-only mode',
        description: "You can't perform Quality tasks. You may view and approve only.",
        variant: 'destructive'
      });
      return;
    }
    try {
      const assessment = qualityAssessments.find(a => a.id === assessmentId);
      if (!assessment) return;

      await updateStoreRecord(assessment.store_record_id, { status: 'in_drying' });
      
      toast({
        title: "Sent to Drier",
        description: `Coffee batch ${assessment.batch_number} has been sent to the drying facility`,
      });
      
    } catch (error) {
      console.error('Error sending to drier:', error);
      toast({
        title: "Error",
        description: "Failed to send coffee to drier",
        variant: "destructive"
      });
    }
  };

  const handlePrintGRN = (assessment: any) => {
    const storeRecord = storeRecords.find(record => record.id === assessment.store_record_id);
    if (storeRecord) {
      const qualityResult = `Moisture: ${assessment.moisture}%, Group 1 Defects: ${assessment.group1_defects}%, Group 2 Defects: ${assessment.group2_defects}%`;
      
      setGrnPrintModal({
        open: true,
        grnData: {
          grnNumber: `GRN-${assessment.batch_number}`,
          supplierName: storeRecord.supplier_name || 'Unknown Supplier',
          coffeeType: storeRecord.coffee_type || 'Unknown Coffee Type', 
          qualityAssessment: qualityResult,
          numberOfBags: storeRecord.bags || 0,
          totalKgs: storeRecord.kilograms || 0,
          unitPrice: assessment.suggested_price || 0,
          assessedBy: assessment.assessed_by || 'Quality Controller',
          createdAt: assessment.date_assessed || new Date().toISOString(),
          moisture: assessment.moisture,
          group1_defects: assessment.group1_defects,
          group2_defects: assessment.group2_defects,
          below12: assessment.below12,
          pods: assessment.pods,
          husks: assessment.husks,
          stones: assessment.stones
        }
      });
    } else {
      toast({
        title: "Error",
        description: "Could not find store record for this assessment",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'assessed':
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Assessed</Badge>;
      case 'submitted_to_finance':
        return <Badge variant="outline"><Send className="h-3 w-3 mr-1" />Sent to Finance</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'in_drying':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><Factory className="h-3 w-3 mr-1" />In Drying</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout title="Quality Control" subtitle="Loading quality control data...">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-gray-600">Loading quality control data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Quality Control" subtitle="Error loading data">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-4">
            <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Retry'}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Layout 
      title="Quality Control" 
      subtitle={`Coffee quality assessment and management - ${currentDate}`}
    >
      <div className="space-y-6">
        {readOnly && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              View-only mode: you can review and approve, but cannot perform Quality tasks.
            </AlertDescription>
          </Alert>
        )}
        {/* Current Prices Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Market Prices
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshPrices}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Prices
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Drugar Local</p>
                <p className="text-lg font-bold text-green-600">UGX {prices.drugarLocal.toLocaleString()}/kg</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Wugar Local</p>
                <p className="text-lg font-bold text-blue-600">UGX {prices.wugarLocal.toLocaleString()}/kg</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Robusta FAQ</p>
                <p className="text-lg font-bold text-purple-600">UGX {prices.robustaFaqLocal.toLocaleString()}/kg</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Exchange Rate</p>
                <p className="text-lg font-bold text-amber-600">UGX {prices.exchangeRate.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">Pending Assessment ({pendingRecords.length})</TabsTrigger>
            <TabsTrigger value="modifications">Modification Requests ({pendingModificationRequests.length})</TabsTrigger>
            <TabsTrigger value="assessments">Quality Assessments ({qualityAssessments.length})</TabsTrigger>
            <TabsTrigger value="reports">Assessment Reports</TabsTrigger>
            <TabsTrigger value="price-calculator" disabled={!selectedRecord}>
              {selectedRecord ? 'Price Assessment' : 'Select Record First'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Quality Assessments</CardTitle>
                <CardDescription>Coffee deliveries awaiting quality assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All Assessments Complete</h3>
                    <p className="text-gray-500">No pending coffee deliveries require assessment</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Bags</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.batch_number}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.coffee_type}</Badge>
                          </TableCell>
                        <TableCell>{record.kilograms?.toLocaleString()}</TableCell>
                        <TableCell>{record.bags}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleStartAssessment(record)}
                              className="mr-2"
                              disabled={readOnly}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Assess
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modifications">
            <Card>
              <CardHeader>
                <CardTitle>Modification Requests</CardTitle>
                <CardDescription>Rejected payments sent to quality for modification</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingModificationRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Edit className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Modification Requests</h3>
                    <p className="text-gray-500">No rejected payments require quality modification</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingModificationRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.batchNumber || 'N/A'}</TableCell>
                          <TableCell>{request.originalPaymentId}</TableCell>
                          <TableCell>{request.requestedBy}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.reason.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{request.comments || 'N/A'}</TableCell>
                          <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleStartModification(request)}
                              disabled={readOnly}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Quality Assessments</CardTitle>
                <CardDescription>Completed and submitted quality assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityAssessments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Yet</h3>
                    <p className="text-gray-500">Quality assessments will appear here once completed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Moisture %</TableHead>
                        <TableHead>Defects</TableHead>
                        <TableHead>Final Price</TableHead>
                        <TableHead>Date Assessed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityAssessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium">{assessment.batch_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Droplets className="h-4 w-4 text-blue-500" />
                              {assessment.moisture}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>G1: {assessment.group1_defects}%</div>
                              <div>G2: {assessment.group2_defects}%</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            UGX {assessment.suggested_price?.toLocaleString()}
                          </TableCell>
                          <TableCell>{assessment.date_assessed}</TableCell>
                          <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {assessment.status === 'assessed' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSubmitToFinance(assessment.id)}
                                  disabled={readOnly}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send to Finance
                                </Button>
                              )}
                              {(assessment.status === 'paid' || assessment.status === 'submitted_to_finance') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleSendToDrier(assessment.id)}
                                  disabled={readOnly}
                                >
                                  <Factory className="h-4 w-4 mr-1" />
                                  Send to Drier
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePrintGRN(assessment)}
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                Print GRN
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="price-calculator">
            {selectedRecord && (
              <Card>
                <CardHeader>
                  <CardTitle>Price Assessment - {selectedRecord.batch_number}</CardTitle>
                  <CardDescription>
                    Supplier: {selectedRecord.supplier_name} | Coffee Type: {selectedRecord.coffee_type} | Weight: {selectedRecord.kilograms} kg
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ArabicaPriceCalculator 
                    onPriceChange={(price) => {
                      setAssessmentForm(prev => ({
                        ...prev,
                        manual_price: price ? price.toString() : ''
                      }));
                    }}
                    onCalculationChange={(results, calculatorState) => {
                      setAssessmentForm(prev => ({
                        ...prev,
                        // Quality parameters from calculator state
                        moisture: calculatorState.moisture,
                        group1_defects: calculatorState.gp1,
                        group2_defects: calculatorState.gp2,
                        below12: calculatorState.less12,
                        pods: calculatorState.pods,
                        husks: calculatorState.husks,
                        stones: calculatorState.stones,
                        discretion: calculatorState.discretion,
                        ref_price: calculatorState.refPrice,
                        // Calculation results
                        fm: results.fm,
                        actual_ott: results.actualOtt,
                        clean_d14: results.cleanD14,
                        outturn: typeof results.outturn === 'number' ? results.outturn : 0,
                        outturn_price: typeof results.outturnPrice === 'number' ? results.outturnPrice : 0,
                        final_price: typeof results.finalPrice === 'number' ? results.finalPrice : 0,
                        quality_note: results.qualityNote,
                        reject_outturn_price: results.rejectOutturnPrice,
                        reject_final: results.rejectFinal
                      }));
                    }}
                  />
                  
                  {/* Price Selection Toggle */}
                  <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Price Selection Method</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={!assessmentForm.use_manual_price ? "default" : "outline"}
                          onClick={() => setAssessmentForm({...assessmentForm, use_manual_price: false})}
                          disabled={readOnly}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Use Calculator Price
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={assessmentForm.use_manual_price ? "default" : "outline"}
                          onClick={() => setAssessmentForm({...assessmentForm, use_manual_price: true})}
                          disabled={readOnly}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Enter Manual Price
                        </Button>
                      </div>
                    </div>

                    {/* Show calculated price or manual input based on toggle */}
                    {!assessmentForm.use_manual_price ? (
                      <div className="bg-background rounded-md p-4 border-2 border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Calculator Final Price (per kg):</span>
                          <span className="text-2xl font-bold text-primary">
                            UGX {assessmentForm.final_price ? assessmentForm.final_price.toLocaleString() : '0'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This unit price is automatically calculated based on quality parameters above
                        </p>
                        {selectedRecord && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Amount:</span>
                              <span className="font-semibold">
                                UGX {((assessmentForm.final_price || 0) * (selectedRecord.kilograms || 0)).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {assessmentForm.final_price?.toLocaleString()} × {selectedRecord.kilograms} kg
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="manual_price">Enter Manual Price (UGX per kg)</Label>
                        <Input
                          id="manual_price"
                          type="number"
                          step="1"
                          value={assessmentForm.manual_price}
                          onChange={(e) => setAssessmentForm({...assessmentForm, manual_price: e.target.value})}
                          placeholder="Enter unit price per kilogram"
                          disabled={readOnly}
                          className="text-lg font-semibold"
                        />
                        {selectedRecord && assessmentForm.manual_price && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Amount:</span>
                              <span className="font-semibold">
                                UGX {(parseFloat(assessmentForm.manual_price) * (selectedRecord.kilograms || 0)).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {parseFloat(assessmentForm.manual_price).toLocaleString()} × {selectedRecord.kilograms} kg
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter unit price per kg (not total amount)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 mt-6">
                    <div>
                      <Label htmlFor="assessment_comments">Assessment Comments</Label>
                      <Textarea
                        id="assessment_comments"
                        value={assessmentForm.comments}
                        onChange={(e) => setAssessmentForm({...assessmentForm, comments: e.target.value})}
                        placeholder="Quality assessment notes..."
                        rows={3}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleSubmitAssessment} 
                      className="flex-1"
                      disabled={
                        readOnly || 
                        isSubmitting ||
                        (
                          !(parseFloat(assessmentForm.manual_price) > 0) && 
                          !assessmentForm.final_price && 
                          !calculateSuggestedPrice()
                        )
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving Assessment...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Save Assessment & Send to Finance
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedRecord(null);
                        setActiveTab("pending");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports">
            <QualityAssessmentReports assessments={qualityAssessments} />
          </TabsContent>

        </Tabs>
        
        {/* GRN Print Modal */}
        <GRNPrintModal 
          open={grnPrintModal.open}
          onClose={() => setGrnPrintModal({open: false, grnData: null})}
          grnData={grnPrintModal.grnData}
        />
      </div>
    </Layout>
  );
};

export default QualityControl;
