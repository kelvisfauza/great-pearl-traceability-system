import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useStoreReports } from '@/hooks/useStoreReports';
import { Eye, FileText, Printer, Search, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const StoreReportsList = () => {
  const { reports, loading, requestDeleteReport } = useStoreReports();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: '',
    end: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleDeleteRequest = (report: any) => {
    setSelectedReport(report);
    setDeleteDialogOpen(true);
    setDeleteReason('');
  };

  const handleConfirmDelete = async () => {
    if (!selectedReport || !deleteReason.trim()) return;

    setSubmitting(true);
    try {
      await requestDeleteReport(selectedReport.id, deleteReason);
      setDeleteDialogOpen(false);
      setSelectedReport(null);
      setDeleteReason('');
    } catch (error) {
      console.error('Error submitting delete request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = (report: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Store Report - ${report.date}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Daily Store Report</h1>
              <h2>Date: ${format(new Date(report.date), 'MMMM d, yyyy')}</h2>
            </div>
            
            <div class="details">
              <div class="row">
                <span class="label">Coffee Type:</span>
                <span>${report.coffee_type}</span>
              </div>
              <div class="row">
                <span class="label">Input By:</span>
                <span>${report.input_by}</span>
              </div>
            </div>

            <table>
              <tr>
                <th>Category</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Kilograms Bought</td>
                <td>${report.kilograms_bought} kg</td>
              </tr>
              <tr>
                <td>Average Buying Price</td>
                <td>UGX ${report.average_buying_price.toLocaleString()}/kg</td>
              </tr>
              <tr>
                <td>Kilograms Sold</td>
                <td>${report.kilograms_sold} kg</td>
              </tr>
              <tr>
                <td>Bags Sold</td>
                <td>${report.bags_sold}</td>
              </tr>
              <tr>
                <td>Sold To</td>
                <td>${report.sold_to}</td>
              </tr>
              <tr>
                <td>Bags Left in Store</td>
                <td>${report.bags_left}</td>
              </tr>
              <tr>
                <td>Kilograms Left in Store</td>
                <td>${report.kilograms_left} kg</td>
              </tr>
              <tr>
                <td>Kilograms Unbought in Store</td>
                <td>${report.kilograms_unbought} kg</td>
              </tr>
              <tr>
                <td>Advances Given</td>
                <td>UGX ${report.advances_given.toLocaleString()}</td>
              </tr>
            </table>

            ${report.comments ? `
              <div style="margin-top: 20px;">
                <h3>Comments:</h3>
                <p>${report.comments}</p>
              </div>
            ` : ''}

            <div style="margin-top: 30px; text-align: center; font-size: 12px;">
              <p>Generated on ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
        <CardDescription>
          View and print historical store reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
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
                            onClick={() => handlePrint(report)}
                          >
                            <Printer className="h-4 w-4" />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
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
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Report Deletion</DialogTitle>
            <DialogDescription>
              This will send a deletion request to the admin for approval. Please provide a reason for deleting this report.
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
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default StoreReportsList;