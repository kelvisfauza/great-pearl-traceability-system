
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
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

interface StoreRecord {
  id: string;
  batchNumber: string;
  coffeeType: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier: string;
  status: 'pending' | 'quality_review' | 'pricing' | 'batched' | 'drying' | 'sales' | 'inventory';
}

interface QualityAssessment {
  id: string;
  storeRecordId: string;
  batchNumber: string;
  moisture: number;
  group1Defects: number;
  group2Defects: number;
  below12: number;
  pods: number;
  husks: number;
  stones: number;
  suggestedPrice: number;
  status: 'assessed' | 'priced' | 'price_requested' | 'approved' | 'dispatched';
  comments?: string;
  dateAssessed: string;
  assessedBy: string;
}

const QualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([
    {
      id: '1',
      batchNumber: 'B2024071201',
      coffeeType: 'Drugar',
      date: '2024-07-12',
      kilograms: 500,
      bags: 10,
      supplier: 'Mbale Coffee Growers',
      status: 'quality_review'
    },
    {
      id: '2',
      batchNumber: 'B2024071202',
      coffeeType: 'Wugar',
      date: '2024-07-12',
      kilograms: 300,
      bags: 6,
      supplier: 'Bushenyi Cooperative',
      status: 'pending'
    }
  ]);

  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StoreRecord | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    moisture: 0,
    group1Defects: 0,
    group2Defects: 0,
    below12: 0,
    pods: 0,
    husks: 0,
    stones: 0,
    suggestedPrice: 0,
    comments: ''
  });

  const pendingRecords = storeRecords.filter(record => 
    record.status === 'pending' || record.status === 'quality_review'
  );

  const handleSelectRecord = (record: StoreRecord) => {
    setSelectedRecord(record);
    // Update record status to quality_review if it was pending
    if (record.status === 'pending') {
      setStoreRecords(prev => 
        prev.map(r => r.id === record.id ? { ...r, status: 'quality_review' } : r)
      );
    }
  };

  const handleAssessmentSubmit = () => {
    if (!selectedRecord) return;

    const assessment: QualityAssessment = {
      id: Date.now().toString(),
      storeRecordId: selectedRecord.id,
      batchNumber: selectedRecord.batchNumber,
      ...assessmentForm,
      status: 'assessed',
      dateAssessed: new Date().toISOString().split('T')[0],
      assessedBy: 'Quality Officer'
    };

    setQualityAssessments([...qualityAssessments, assessment]);
    
    // Update store record status
    setStoreRecords(prev => 
      prev.map(r => r.id === selectedRecord.id ? { ...r, status: 'pricing' } : r)
    );

    // Reset form
    setAssessmentForm({
      moisture: 0,
      group1Defects: 0,
      group2Defects: 0,
      below12: 0,
      pods: 0,
      husks: 0,
      stones: 0,
      suggestedPrice: 0,
      comments: ''
    });
    setSelectedRecord(null);
  };

  const handleSubmitToFinance = (assessmentId: string) => {
    setQualityAssessments(prev =>
      prev.map(a => a.id === assessmentId ? { ...a, status: 'priced' } : a)
    );
  };

  const handleRequestPriceApproval = (assessmentId: string) => {
    setQualityAssessments(prev =>
      prev.map(a => a.id === assessmentId ? { ...a, status: 'price_requested' } : a)
    );
  };

  const handleDispatchToDryer = (batchNumber: string) => {
    setStoreRecords(prev => 
      prev.map(r => r.batchNumber === batchNumber ? { ...r, status: 'drying' } : r)
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      quality_review: { label: 'In Review', variant: 'default' as const },
      pricing: { label: 'Pricing', variant: 'default' as const },
      assessed: { label: 'Assessed', variant: 'default' as const },
      priced: { label: 'Priced', variant: 'default' as const },
      price_requested: { label: 'Price Approval', variant: 'destructive' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      dispatched: { label: 'Dispatched', variant: 'default' as const },
      drying: { label: 'Drying', variant: 'default' as const }
    };
    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
  };

  return (
    <Layout 
      title="Quality Control" 
      subtitle="Monitor and maintain coffee quality standards"
    >
      <div className="space-y-6">
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
                  <p className="text-sm font-medium text-gray-600">Ready for Dispatch</p>
                  <p className="text-2xl font-bold">{qualityAssessments.filter(a => a.status === 'approved').length}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              Pending Review
            </TabsTrigger>
            <TabsTrigger value="assessment">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Quality Assessment
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
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
                        <TableCell className="font-mono">{record.batchNumber}</TableCell>
                        <TableCell>{record.coffeeType}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
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
                            disabled={record.status === 'quality_review'}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {record.status === 'quality_review' ? 'Selected' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessment" className="space-y-6">
            {selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment - Batch {selectedRecord.batchNumber}</CardTitle>
                  <CardDescription>
                    {selectedRecord.coffeeType} from {selectedRecord.supplier} - {selectedRecord.kilograms} kg ({selectedRecord.bags} bags)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="moisture">Moisture (%)</Label>
                      <Input
                        id="moisture"
                        type="number"
                        step="0.1"
                        value={assessmentForm.moisture}
                        onChange={(e) => setAssessmentForm({...assessmentForm, moisture: Number(e.target.value)})}
                        placeholder="12.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group1">Group 1 Defects (%)</Label>
                      <Input
                        id="group1"
                        type="number"
                        step="0.1"
                        value={assessmentForm.group1Defects}
                        onChange={(e) => setAssessmentForm({...assessmentForm, group1Defects: Number(e.target.value)})}
                        placeholder="2.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group2">Group 2 Defects (%)</Label>
                      <Input
                        id="group2"
                        type="number"
                        step="0.1"
                        value={assessmentForm.group2Defects}
                        onChange={(e) => setAssessmentForm({...assessmentForm, group2Defects: Number(e.target.value)})}
                        placeholder="1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="below12">Below 12 Screen (%)</Label>
                      <Input
                        id="below12"
                        type="number"
                        step="0.1"
                        value={assessmentForm.below12}
                        onChange={(e) => setAssessmentForm({...assessmentForm, below12: Number(e.target.value)})}
                        placeholder="3.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pods">Pods (%)</Label>
                      <Input
                        id="pods"
                        type="number"
                        step="0.1"
                        value={assessmentForm.pods}
                        onChange={(e) => setAssessmentForm({...assessmentForm, pods: Number(e.target.value)})}
                        placeholder="0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="husks">Husks (%)</Label>
                      <Input
                        id="husks"
                        type="number"
                        step="0.1"
                        value={assessmentForm.husks}
                        onChange={(e) => setAssessmentForm({...assessmentForm, husks: Number(e.target.value)})}
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stones">Stones (%)</Label>
                      <Input
                        id="stones"
                        type="number"
                        step="0.1"
                        value={assessmentForm.stones}
                        onChange={(e) => setAssessmentForm({...assessmentForm, stones: Number(e.target.value)})}
                        placeholder="0.2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Suggested Price (UGX/kg)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={assessmentForm.suggestedPrice}
                        onChange={(e) => setAssessmentForm({...assessmentForm, suggestedPrice: Number(e.target.value)})}
                        placeholder="8500"
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
                    />
                  </div>

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
                                  To Finance
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRequestPriceApproval(assessment.id)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Request Price
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        <TableCell className="font-mono">{record.batchNumber}</TableCell>
                        <TableCell>{record.coffeeType}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
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
                              onClick={() => handleDispatchToDryer(record.batchNumber)}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default QualityControl;
