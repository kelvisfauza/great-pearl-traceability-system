import { useState } from "react";
import Layout from "@/components/Layout";
import PriceTicker from "@/components/PriceTicker";
import PricingGuidance from "@/components/PricingGuidance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock, DollarSign, Send, Eye, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQualityControl, StoreRecord } from "@/hooks/useQualityControl";

const QualityControl = () => {
  const { toast } = useToast();
  const {
    storeRecords,
    qualityAssessments,
    pendingRecords,
    loading,
    updateStoreRecord,
    addQualityAssessment,
    updateQualityAssessment,
  } = useQualityControl();

  const [selectedRecord, setSelectedRecord] = useState<StoreRecord | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    moisture: '',
    group1Defects: '',
    group2Defects: '',
    below12: '',
    pods: '',
    husks: '',
    stones: '',
    suggestedPrice: '',
    comments: ''
  });

  const handleSelectRecord = (record: StoreRecord) => {
    setSelectedRecord(record);
    // Update record status to quality_review if it was pending
    if (record.status === 'pending') {
      updateStoreRecord(record.id, { status: 'quality_review' });
    }
    toast({
      title: "Batch Selected",
      description: `Selected batch ${record.batch_number} for quality assessment`,
    });
  };

  const handleAssessmentSubmit = () => {
    if (!selectedRecord) return;

    // Validate form
    if (!assessmentForm.moisture || !assessmentForm.suggestedPrice) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least moisture and price information",
        variant: "destructive"
      });
      return;
    }

    const assessment = {
      storeRecordId: selectedRecord.id,
      batchNumber: selectedRecord.batch_number,
      moisture: Number(assessmentForm.moisture),
      group1Defects: Number(assessmentForm.group1Defects) || 0,
      group2Defects: Number(assessmentForm.group2Defects) || 0,
      below12: Number(assessmentForm.below12) || 0,
      pods: Number(assessmentForm.pods) || 0,
      husks: Number(assessmentForm.husks) || 0,
      stones: Number(assessmentForm.stones) || 0,
      suggestedPrice: Number(assessmentForm.suggestedPrice),
      status: 'assessed' as const,
      comments: assessmentForm.comments,
      dateAssessed: new Date().toISOString().split('T')[0],
      assessedBy: 'Quality Officer'
    };

    addQualityAssessment(assessment);
    
    // Update store record status
    updateStoreRecord(selectedRecord.id, { status: 'pricing' });

    // Reset form
    setAssessmentForm({
      moisture: '',
      group1Defects: '',
      group2Defects: '',
      below12: '',
      pods: '',
      husks: '',
      stones: '',
      suggestedPrice: '',
      comments: ''
    });
    setSelectedRecord(null);

    toast({
      title: "Assessment Complete",
      description: `Quality assessment for batch ${assessment.batchNumber} has been saved`,
    });
  };

  const handleSubmitToFinance = (assessmentId: string) => {
    updateQualityAssessment(assessmentId, { status: 'submitted_to_finance' });
    toast({
      title: "Submitted to Finance",
      description: "Assessment has been sent to finance department for pricing approval",
    });
  };

  const handleRequestPriceApproval = (assessmentId: string) => {
    updateQualityAssessment(assessmentId, { status: 'price_requested' });
    toast({
      title: "Price Approval Requested",
      description: "Price approval request sent to supervisor and operations manager",
    });
  };

  const handleDispatchToDryer = (batchNumber: string) => {
    const record = storeRecords.find(r => r.batch_number === batchNumber);
    if (record) {
      updateStoreRecord(record.id, { status: 'drying' });
      toast({
        title: "Dispatched to Dryer",
        description: `Batch ${batchNumber} has been sent to the dryer`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      quality_review: { label: 'In Review', variant: 'default' as const },
      pricing: { label: 'Pricing', variant: 'default' as const },
      assessed: { label: 'Assessed', variant: 'default' as const },
      submitted_to_finance: { label: 'With Finance', variant: 'default' as const },
      price_requested: { label: 'Price Approval', variant: 'destructive' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      dispatched: { label: 'Dispatched', variant: 'default' as const },
      drying: { label: 'Drying', variant: 'default' as const }
    };
    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
  };

  if (loading) {
    return (
      <Layout title="Quality Control" subtitle="Monitor and maintain coffee quality standards">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Quality Control" 
      subtitle="Monitor and maintain coffee quality standards"
    >
      <div className="space-y-6">
        {/* Price Ticker */}
        <PriceTicker />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingRecords.length}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assessed Today</p>
                  <p className="text-2xl font-bold">{qualityAssessments.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Price Requests</p>
                  <p className="text-2xl font-bold">{qualityAssessments.filter(a => a.status === 'price_requested').length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Finance</p>
                  <p className="text-2xl font-bold">{qualityAssessments.filter(a => a.status === 'submitted_to_finance').length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              Pending Review ({pendingRecords.length})
            </TabsTrigger>
            <TabsTrigger value="assessment">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Quality Assessment
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed ({qualityAssessments.length})
            </TabsTrigger>
            <TabsTrigger value="dispatch">
              <Truck className="h-4 w-4 mr-2" />
              Dispatch Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Records Awaiting Quality Review</CardTitle>
                <CardDescription>Select batches from store for quality assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending records found. Records from Store Management will appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Kilograms</TableHead>
                        <TableHead>Bags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.batch_number}</TableCell>
                          <TableCell>{record.coffee_type}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.kilograms} kg</TableCell>
                          <TableCell>{record.bags}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(record.status).variant}>
                              {getStatusBadge(record.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleSelectRecord(record)}
                              disabled={record.status === 'quality_review' && selectedRecord?.id === record.id}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {selectedRecord?.id === record.id ? 'Selected' : 'Select'}
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

          <TabsContent value="assessment" className="space-y-6">
            {selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment - Batch {selectedRecord.batch_number}</CardTitle>
                  <CardDescription>
                    {selectedRecord.coffee_type} from {selectedRecord.supplier_name} - {selectedRecord.kilograms} kg ({selectedRecord.bags} bags)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="moisture">Moisture (%) *</Label>
                      <Input
                        id="moisture"
                        type="number"
                        step="0.1"
                        value={assessmentForm.moisture}
                        onChange={(e) => setAssessmentForm({...assessmentForm, moisture: e.target.value})}
                        placeholder="12.5"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group1">Group 1 Defects (%)</Label>
                      <Input
                        id="group1"
                        type="number"
                        step="0.1"
                        value={assessmentForm.group1Defects}
                        onChange={(e) => setAssessmentForm({...assessmentForm, group1Defects: e.target.value})}
                        placeholder="2.0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group2">Group 2 Defects (%)</Label>
                      <Input
                        id="group2"
                        type="number"
                        step="0.1"
                        value={assessmentForm.group2Defects}
                        onChange={(e) => setAssessmentForm({...assessmentForm, group2Defects: e.target.value})}
                        placeholder="1.5"
                        className="mt-1"
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
                        placeholder="3.0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pods">Pods (%)</Label>
                      <Input
                        id="pods"
                        type="number"
                        step="0.1"
                        value={assessmentForm.pods}
                        onChange={(e) => setAssessmentForm({...assessmentForm, pods: e.target.value})}
                        placeholder="0.5"
                        className="mt-1"
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
                        placeholder="1.0"
                        className="mt-1"
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
                        placeholder="0.2"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Suggested Price (UGX/kg) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={assessmentForm.suggestedPrice}
                        onChange={(e) => setAssessmentForm({...assessmentForm, suggestedPrice: e.target.value})}
                        placeholder="8500"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="comments">Comments (Optional)</Label>
                    <Textarea
                      id="comments"
                      value={assessmentForm.comments}
                      onChange={(e) => setAssessmentForm({...assessmentForm, comments: e.target.value})}
                      placeholder="Additional observations or notes..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Pricing Guidance */}
                  {assessmentForm.suggestedPrice && (
                    <PricingGuidance 
                      coffeeType={selectedRecord.coffee_type}
                      suggestedPrice={Number(assessmentForm.suggestedPrice)}
                    />
                  )}

                  <div className="flex gap-4">
                    <Button onClick={handleAssessmentSubmit} className="flex-1">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Complete Assessment
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Batch Selected</h3>
                  <p className="text-gray-500">Select a batch from the "Pending Review" tab to start quality assessment.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Completed Quality Assessments</CardTitle>
                <CardDescription>All assessed batches with quality parameters and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityAssessments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No completed assessments yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Moisture</TableHead>
                        <TableHead>G1 Defects</TableHead>
                        <TableHead>G2 Defects</TableHead>
                        <TableHead>Price (UGX/kg)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityAssessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-mono">{assessment.batchNumber}</TableCell>
                          <TableCell>{assessment.moisture}%</TableCell>
                          <TableCell>{assessment.group1Defects}%</TableCell>
                          <TableCell>{assessment.group2Defects}%</TableCell>
                          <TableCell>UGX {assessment.suggestedPrice.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(assessment.status).variant}>
                              {getStatusBadge(assessment.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {assessment.status === 'assessed' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleSubmitToFinance(assessment.id)}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Submit to Finance
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleRequestPriceApproval(assessment.id)}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Request Price Approval
                                  </Button>
                                </>
                              )}
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

          <TabsContent value="dispatch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Management</CardTitle>
                <CardDescription>Manage batch dispatch to dryers or other destinations</CardDescription>
              </CardHeader>
              <CardContent>
                {storeRecords.filter(r => r.status === 'pricing' || r.status === 'batched').length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No batches ready for dispatch</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Kilograms</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeRecords.filter(r => r.status === 'pricing' || r.status === 'batched').map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.batch_number}</TableCell>
                          <TableCell>{record.coffee_type}</TableCell>
                          <TableCell>{record.supplier_name}</TableCell>
                          <TableCell>{record.kilograms} kg</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(record.status).variant}>
                              {getStatusBadge(record.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleDispatchToDryer(record.batch_number)}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                To Dryer
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default QualityControl;
