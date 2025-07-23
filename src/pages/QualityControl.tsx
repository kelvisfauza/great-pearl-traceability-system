import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQualityControl } from "@/hooks/useQualityControl";
import { usePrices } from "@/contexts/PriceContext";
import { useToast } from "@/hooks/use-toast";
import GRNPrintModal from "@/components/quality/GRNPrintModal";

const QualityControl = () => {
  const {
    storeRecords,
    qualityAssessments,
    pendingRecords,
    loading,
    addQualityAssessment,
    updateStoreRecord,
    submitToFinance
  } = useQualityControl();

  const { prices, refreshPrices } = usePrices();
  const { toast } = useToast();

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [assessmentForm, setAssessmentForm] = useState({
    moisture: '',
    group1_defects: '',
    group2_defects: '',
    below12: '',
    pods: '',
    husks: '',
    stones: '',
    manual_price: '',
    comments: ''
  });
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
    } | null;
  }>({
    open: false,
    grnData: null
  });

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  const handleStartAssessment = (record: any) => {
    console.log('Starting assessment for record:', record);
    setSelectedRecord(record);
    setAssessmentForm({
      moisture: '',
      group1_defects: '',
      group2_defects: '',
      below12: '',
      pods: '',
      husks: '',
      stones: '',
      manual_price: '',
      comments: ''
    });
    setActiveTab("assessment-form");
  };

  const calculateSuggestedPrice = () => {
    if (!selectedRecord) return 0;
    
    console.log('Calculating price with current prices:', prices);
    console.log('Selected record coffee type:', selectedRecord.coffee_type);
    
    let basePrice = 0;
    const coffeeType = selectedRecord.coffee_type?.toLowerCase();
    
    if (coffeeType?.includes('arabica') || coffeeType?.includes('drugar')) {
      basePrice = prices.drugarLocal;
    } else if (coffeeType?.includes('robusta')) {
      basePrice = prices.robustaFaqLocal;
    } else {
      basePrice = prices.drugarLocal;
    }
    
    console.log('Base price selected:', basePrice, 'for coffee type:', coffeeType);
    
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
    console.log('Calculated suggested price:', suggestedPrice, 'Base price:', basePrice, 'Adjustment:', adjustment);
    
    return suggestedPrice;
  };

  const handleSubmitAssessment = async () => {
    if (!selectedRecord) {
      toast({
        title: "Error",
        description: "No record selected for assessment",
        variant: "destructive"
      });
      return;
    }

    const finalPrice = parseFloat(assessmentForm.manual_price) || calculateSuggestedPrice();
    
    if (finalPrice <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price for the assessment.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Submitting quality assessment...');
      
      const assessment = {
        store_record_id: selectedRecord.id,
        batch_number: selectedRecord.batch_number,
        moisture: parseFloat(assessmentForm.moisture) || 0,
        group1_defects: parseFloat(assessmentForm.group1_defects) || 0,
        group2_defects: parseFloat(assessmentForm.group2_defects) || 0,
        below12: parseFloat(assessmentForm.below12) || 0,
        pods: parseFloat(assessmentForm.pods) || 0,
        husks: parseFloat(assessmentForm.husks) || 0,
        stones: parseFloat(assessmentForm.stones) || 0,
        suggested_price: finalPrice,
        status: 'assessed' as const,
        comments: assessmentForm.comments,
        date_assessed: new Date().toISOString().split('T')[0],
        assessed_by: 'Quality Controller',
      };

      console.log('Assessment data:', assessment);
      
      await addQualityAssessment(assessment);
      
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
        manual_price: '',
        comments: ''
      });
      setActiveTab("assessments");
      
      toast({
        title: "Assessment Complete",
        description: "Quality assessment saved and sent to finance for payment processing"
      });
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to submit quality assessment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitToFinance = async (assessmentId: string) => {
    try {
      await submitToFinance(assessmentId);
    } catch (error) {
      console.error('Error submitting to finance:', error);
    }
  };

  const handleSendToDrier = async (assessmentId: string) => {
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
          supplierName: storeRecord.supplier_name,
          coffeeType: storeRecord.coffee_type,
          qualityAssessment: qualityResult,
          numberOfBags: storeRecord.bags,
          totalKgs: storeRecord.kilograms,
          unitPrice: assessment.suggested_price,
          assessedBy: assessment.assessed_by,
          createdAt: assessment.date_assessed
        }
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
      <Layout title="Quality Control" subtitle="Loading...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                Refresh Prices
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Assessment ({pendingRecords.length})</TabsTrigger>
            <TabsTrigger value="assessments">Quality Assessments ({qualityAssessments.length})</TabsTrigger>
            <TabsTrigger value="assessment-form" disabled={!selectedRecord}>
              {selectedRecord ? 'Assessment Form' : 'Select Record First'}
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

          <TabsContent value="assessment-form">
            {selectedRecord && (
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment Form</CardTitle>
                  <CardDescription>
                    Assessing: {selectedRecord.batch_number} - {selectedRecord.supplier_name} ({selectedRecord.coffee_type})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="moisture">Moisture Content (%)</Label>
                        <Input
                          id="moisture"
                          type="number"
                          step="0.1"
                          value={assessmentForm.moisture}
                          onChange={(e) => setAssessmentForm({...assessmentForm, moisture: e.target.value})}
                          placeholder="12.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="group1">Group 1 Defects (%)</Label>
                        <Input
                          id="group1"
                          type="number"
                          step="0.1"
                          value={assessmentForm.group1_defects}
                          onChange={(e) => setAssessmentForm({...assessmentForm, group1_defects: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="group2">Group 2 Defects (%)</Label>
                        <Input
                          id="group2"
                          type="number"
                          step="0.1"
                          value={assessmentForm.group2_defects}
                          onChange={(e) => setAssessmentForm({...assessmentForm, group2_defects: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="below12">Below 12 Screen (%)</Label>
                        <Input
                          id="below12"
                          type="number"
                          step="0.1"
                          value={assessmentForm.below12}
                          onChange={(e) => setAssessmentForm({...assessmentForm, below12: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pods">Pods (%)</Label>
                        <Input
                          id="pods"
                          type="number"
                          step="0.1"
                          value={assessmentForm.pods}
                          onChange={(e) => setAssessmentForm({...assessmentForm, pods: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="husks">Husks (%)</Label>
                        <Input
                          id="husks"
                          type="number"
                          step="0.1"
                          value={assessmentForm.husks}
                          onChange={(e) => setAssessmentForm({...assessmentForm, husks: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="stones">Stones (%)</Label>
                        <Input
                          id="stones"
                          type="number"
                          step="0.1"
                          value={assessmentForm.stones}
                          onChange={(e) => setAssessmentForm({...assessmentForm, stones: e.target.value})}
                          placeholder="0.0"
                        />
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-blue-800">Suggested Price</span>
                        </div>
                        <p className="text-lg font-bold text-blue-600 mb-2">
                          UGX {calculateSuggestedPrice().toLocaleString()}
                        </p>
                        <p className="text-sm text-blue-600">
                          Based on current market rates and quality parameters
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual_price">Final Price (Manual Override)</Label>
                      <Input
                        id="manual_price"
                        type="number"
                        step="1"
                        value={assessmentForm.manual_price}
                        onChange={(e) => setAssessmentForm({...assessmentForm, manual_price: e.target.value})}
                        placeholder={`Enter price or leave blank to use suggested: ${calculateSuggestedPrice().toLocaleString()}`}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Leave blank to use suggested price, or enter your own price
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea
                        id="comments"
                        value={assessmentForm.comments}
                        onChange={(e) => setAssessmentForm({...assessmentForm, comments: e.target.value})}
                        placeholder="Additional observations or notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button onClick={handleSubmitAssessment} className="flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Assessment & Submit to Finance
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
