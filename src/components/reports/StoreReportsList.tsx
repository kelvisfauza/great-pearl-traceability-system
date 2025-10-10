import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useStoreReports } from '@/hooks/useStoreReports';
import { Eye, FileText, Printer, Search, Calendar, Trash2, Edit, Database, Upload, FileDown, Files, CalendarCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import StoreReportViewer from './StoreReportViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateStoreReportPDF, generateMultipleReportsPDF } from '@/utils/pdfGenerator';

const StoreReportsList = () => {
  const { reports, loading, directDeleteReport, directEditReport, migrateFirebaseToSupabase } = useStoreReports();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  });
  const [quickFilter, setQuickFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [editReason, setEditReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [uploadingEditFile, setUploadingEditFile] = useState(false);

  // Handle quick filters
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    const today = new Date();
    
    switch (filter) {
      case 'previous-month':
        const prevMonth = subMonths(today, 1);
        const startOfPrevMonth = startOfMonth(prevMonth);
        const endOfPrevMonth = endOfMonth(prevMonth);
        setSelectedDateRange({
          start: format(startOfPrevMonth, 'yyyy-MM-dd'),
          end: format(endOfPrevMonth, 'yyyy-MM-dd')
        });
        break;
      case 'current-month':
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);
        setSelectedDateRange({
          start: format(startOfCurrentMonth, 'yyyy-MM-dd'),
          end: format(endOfCurrentMonth, 'yyyy-MM-dd')
        });
        break;
      case 'all':
        setSelectedDateRange({ start: '', end: '' });
        break;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.coffee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.input_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.sold_to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = 
      (!selectedDateRange.start || report.date >= selectedDateRange.start) &&
      (!selectedDateRange.end || report.date <= selectedDateRange.end);
    
    return matchesSearch && matchesDateRange;
  });

  // Calculate customer debt analysis for filtered reports
  const customerDebtAnalysis = () => {
    const customerTotals = filteredReports.reduce((acc, report) => {
      if (report.sold_to && report.sold_to !== 'N/A') {
        if (!acc[report.sold_to]) {
          acc[report.sold_to] = {
            name: report.sold_to,
            totalSold: 0,
            totalAdvances: 0,
            reports: 0
          };
        }
        acc[report.sold_to].totalSold += report.kilograms_sold;
        acc[report.sold_to].totalAdvances += report.advances_given;
        acc[report.sold_to].reports += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; totalSold: number; totalAdvances: number; reports: number }>);

    const customers = Object.values(customerTotals).sort((a, b) => b.totalAdvances - a.totalAdvances);
    
    return {
      highest: customers[0] || null,
      lowest: customers[customers.length - 1] || null,
      all: customers
    };
  };

  const debtAnalysis = customerDebtAnalysis();

  const handleDeleteRequest = (report: any) => {
    setSelectedReport(report);
    setDeleteDialogOpen(true);
    setDeleteReason('');
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleEditRequest = (report: any) => {
    setSelectedReport(report);
    setEditFormData({
      date: report.date,
      coffee_type: report.coffee_type,
      kilograms_bought: report.kilograms_bought,
      average_buying_price: report.average_buying_price,
      kilograms_sold: report.kilograms_sold,
      bags_sold: report.bags_sold,
      sold_to: report.sold_to,
      bags_left: report.bags_left,
      kilograms_left: report.kilograms_left,
      kilograms_unbought: report.kilograms_unbought,
      advances_given: report.advances_given,
      comments: report.comments,
      input_by: report.input_by,
      attachment_url: report.attachment_url,
      attachment_name: report.attachment_name,
      scanner_used: report.scanner_used
    });
    setEditDialogOpen(true);
    setEditReason('');
  };

  const handleConfirmDelete = async () => {
    console.log('=== DELETE HANDLER CALLED ===');
    console.log('Selected report:', selectedReport);
    console.log('Delete reason:', deleteReason);
    
    if (!selectedReport || !deleteReason.trim()) {
      console.log('❌ Early return - missing report or reason');
      return;
    }

    console.log('✅ Proceeding with deletion');
    setSubmitting(true);
    try {
      await directDeleteReport(selectedReport.id, deleteReason);
      setDeleteDialogOpen(false);
      setSelectedReport(null);
      setDeleteReason('');
    } catch (error) {
      console.error('Error deleting report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmEdit = async () => {
    if (!selectedReport) return;

    setSubmitting(true);
    try {
      const result = await directEditReport(selectedReport.id, editFormData);
      
      if (result) {
        setEditDialogOpen(false);
        setSelectedReport(null);
        setEditFormData({});
      }
    } catch (error) {
      console.error('Error updating report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG) or PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadingEditFile(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('report-documents')
        .getPublicUrl(filePath);

      // Store the file path instead of public URL for private bucket
      setEditFormData(prev => ({
        ...prev,
        attachment_url: filePath, // Store the file path, not public URL
        attachment_name: file.name
      }));

      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingEditFile(false);
    }
  };

  const handleBulkPDF = () => {
    if (filteredReports.length === 0) {
      toast.error("No reports to generate PDF for");
      return;
    }
    
    try {
      const title = searchTerm ? `Store Reports - Search: ${searchTerm}` : 'Store Reports';
      generateMultipleReportsPDF(filteredReports, title);
      toast.success(`PDF with ${filteredReports.length} reports generated successfully!`);
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  const handlePrint = (report: any) => {
    try {
      generateStoreReportPDF(report);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading store reports...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Store Reports History
          </CardTitle>
          <CardDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>View and export historical store reports as PDF</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPDF}
                disabled={filteredReports.length === 0}
                className="flex items-center gap-2"
              >
                <Files className="h-4 w-4" />
                Export All PDF ({filteredReports.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={migrateFirebaseToSupabase}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Migrate Data
              </Button>
            </div>
          </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={quickFilter === 'previous-month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('previous-month')}
                className="flex items-center gap-2"
              >
                <CalendarCheck className="h-4 w-4" />
                Previous Month
              </Button>
              <Button
                variant={quickFilter === 'current-month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('current-month')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Current Month
              </Button>
              <Button
                variant={quickFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('all')}
                className="flex items-center gap-2"
              >
                <Files className="h-4 w-4" />
                All Reports
              </Button>
            </div>

            {/* Search and Date Range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by coffee type, input by, or sold to..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={selectedDateRange.start}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={selectedDateRange.end}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead>Bought (kg)</TableHead>
                  <TableHead>Sold (kg)</TableHead>
                  <TableHead>Sold To</TableHead>
                  <TableHead>Input By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No store reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(report.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.coffee_type}</Badge>
                      </TableCell>
                      <TableCell>{report.kilograms_bought} kg</TableCell>
                      <TableCell>{report.kilograms_sold} kg</TableCell>
                      <TableCell>{report.sold_to || 'N/A'}</TableCell>
                      <TableCell>{report.input_by}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(report)}
                            title="Generate PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRequest(report)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRequest(report)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {filteredReports.length > 0 && (
            <div className="space-y-6 pt-4 border-t">
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {filteredReports.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredReports.reduce((sum, report) => sum + report.kilograms_bought, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Kg Bought</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredReports.reduce((sum, report) => sum + report.kilograms_sold, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Kg Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    UGX {filteredReports.reduce((sum, report) => sum + report.advances_given, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Advances</div>
                </div>
              </div>

              {/* Customer Debt Analysis */}
              {(quickFilter === 'previous-month' || selectedDateRange.start) && debtAnalysis.all.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Customer Debt Analysis
                    {quickFilter === 'previous-month' && (
                      <Badge variant="outline">Previous Month</Badge>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Highest Debt Customer */}
                    {debtAnalysis.highest && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-red-500" />
                            Highest Debt Customer
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="font-semibold">{debtAnalysis.highest.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Advances:</span>
                                <p className="font-medium text-red-600">
                                  UGX {debtAnalysis.highest.totalAdvances.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Coffee Sold:</span>
                                <p className="font-medium">{debtAnalysis.highest.totalSold.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Transactions:</span>
                                <p className="font-medium">{debtAnalysis.highest.reports}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lowest Debt Customer */}
                    {debtAnalysis.lowest && debtAnalysis.all.length > 1 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-green-500" />
                            Lowest Debt Customer
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="font-semibold">{debtAnalysis.lowest.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Advances:</span>
                                <p className="font-medium text-green-600">
                                  UGX {debtAnalysis.lowest.totalAdvances.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Coffee Sold:</span>
                                <p className="font-medium">{debtAnalysis.lowest.totalSold.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Transactions:</span>
                                <p className="font-medium">{debtAnalysis.lowest.reports}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* All Customers Summary */}
                  {debtAnalysis.all.length > 2 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">All Customers Debt Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {debtAnalysis.all.map((customer, index) => (
                            <div key={customer.name} className="flex justify-between items-center text-sm py-1 border-b last:border-b-0">
                              <span className="font-medium">{customer.name}</span>
                              <div className="text-right">
                                <p className="font-medium">UGX {customer.totalAdvances.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{customer.totalSold.toFixed(1)} kg</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* View Report Dialog */}
      <StoreReportViewer
        report={selectedReport}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              This will permanently delete the report and log the action for audit purposes. Please provide a reason for deleting this report.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Report Date:</strong> {format(new Date(selectedReport.date), 'MMMM d, yyyy')}</p>
                <p><strong>Coffee Type:</strong> {selectedReport.coffee_type}</p>
                <p><strong>Input By:</strong> {selectedReport.input_by}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for deletion:</label>
                <Textarea
                  placeholder="Please explain why this report needs to be deleted..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={submitting || !deleteReason.trim()}
            >
              {submitting ? 'Deleting...' : 'Delete Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
            <DialogDescription>
              This will update the report immediately and log the action for audit purposes. Make your changes and provide a reason for editing this report.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Original Report Date:</strong> {format(new Date(selectedReport.date), 'MMMM d, yyyy')}</p>
                <p><strong>Coffee Type:</strong> {selectedReport.coffee_type}</p>
                <p><strong>Input By:</strong> {selectedReport.input_by}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_date">Date</Label>
                  <Input
                    id="edit_date"
                    type="date"
                    value={editFormData.date || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_coffee_type">Coffee Type</Label>
                  <Select 
                    value={editFormData.coffee_type || ''} 
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, coffee_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coffee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arabica">Arabica</SelectItem>
                      <SelectItem value="Robusta">Robusta</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_kilograms_bought">Kilograms Bought</Label>
                  <Input
                    id="edit_kilograms_bought"
                    type="number"
                    step="0.01"
                    value={editFormData.kilograms_bought || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, kilograms_bought: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_average_buying_price">Average Buying Price (UGX/kg)</Label>
                  <Input
                    id="edit_average_buying_price"
                    type="number"
                    step="0.01"
                    value={editFormData.average_buying_price || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, average_buying_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_kilograms_sold">Kilograms Sold</Label>
                  <Input
                    id="edit_kilograms_sold"
                    type="number"
                    step="0.01"
                    value={editFormData.kilograms_sold || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, kilograms_sold: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_bags_sold">Number of Bags Sold</Label>
                  <Input
                    id="edit_bags_sold"
                    type="number"
                    value={editFormData.bags_sold || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bags_sold: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_sold_to">Sold To</Label>
                  <Input
                    id="edit_sold_to"
                    type="text"
                    value={editFormData.sold_to || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, sold_to: e.target.value }))}
                    placeholder="Customer/buyer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_bags_left">Bags Left in Store</Label>
                  <Input
                    id="edit_bags_left"
                    type="number"
                    value={editFormData.bags_left || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bags_left: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_kilograms_left">Kilograms Left in Store</Label>
                  <Input
                    id="edit_kilograms_left"
                    type="number"
                    step="0.01"
                    value={editFormData.kilograms_left || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, kilograms_left: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_kilograms_unbought">Kilograms Unbought in Store</Label>
                  <Input
                    id="edit_kilograms_unbought"
                    type="number"
                    step="0.01"
                    value={editFormData.kilograms_unbought || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, kilograms_unbought: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_advances_given">Advances Given (UGX)</Label>
                  <Input
                    id="edit_advances_given"
                    type="number"
                    step="0.01"
                    value={editFormData.advances_given || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, advances_given: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_input_by">Input By</Label>
                  <Input
                    id="edit_input_by"
                    type="text"
                    value={editFormData.input_by || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, input_by: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
              </div>

              {/* Document Attachment Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Attachment
                </h3>
                
                {editFormData.attachment_name && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 border border-green-200 rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Current: {editFormData.attachment_name}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Upload New Document (Optional)</Label>
                  <div className="flex gap-2">
                    <input
                      id="edit-file-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-file-upload')?.click()}
                      disabled={uploadingEditFile}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingEditFile ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_comments">Comments</Label>
                <Textarea
                  id="edit_comments"
                  value={editFormData.comments || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Additional notes or observations"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEdit}
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StoreReportsList;