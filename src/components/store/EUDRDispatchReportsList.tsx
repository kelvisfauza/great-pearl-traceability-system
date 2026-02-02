import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download, FileText, Truck, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TruckData {
  truck_number: string;
  total_bags_loaded: number;
  total_weight_store: number;
  traceability_confirmed: boolean;
  lot_batch_references: string;
  quality_report_attached: boolean;
}

interface BuyerVerification {
  truck_number: number;
  buyer_bags_count: number;
  buyer_weight: number;
  store_weight: number;
  difference: number;
}

interface DispatchReport {
  id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  dispatch_date: string;
  dispatch_location: string;
  coffee_type: string;
  destination_buyer: string;
  dispatch_supervisor: string;
  vehicle_registrations: string;
  trucks: TruckData[];
  buyer_verification: BuyerVerification[];
  quality_checked_by_buyer: boolean;
  buyer_quality_remarks: string;
  bags_deducted: number;
  deduction_reasons: string[];
  total_deducted_weight: number;
  remarks: string;
  attachment_url: string | null;
  attachment_name: string | null;
  status: string;
}

interface EUDRDispatchReportsListProps {
  reports: DispatchReport[];
  showAll?: boolean;
}

const EUDRDispatchReportsList = ({ reports, showAll = false }: EUDRDispatchReportsListProps) => {
  const displayReports = showAll ? reports : reports.slice(0, 5);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No dispatch comparison reports yet</p>
        </CardContent>
      </Card>
    );
  }

  const getTotalWeight = (trucks: TruckData[]) => {
    return trucks.reduce((sum, t) => sum + (t.total_weight_store || 0), 0);
  };

  const getTotalDifference = (verification: BuyerVerification[]) => {
    return verification.reduce((sum, v) => sum + (v.difference || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {showAll ? 'All Dispatch Comparison Reports' : 'Recent Dispatch Reports'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Coffee Type</TableHead>
              <TableHead>Trucks</TableHead>
              <TableHead>Total Weight</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayReports.map((report) => {
              const trucks = Array.isArray(report.trucks) ? report.trucks : [];
              const verification = Array.isArray(report.buyer_verification) ? report.buyer_verification : [];
              const totalWeight = getTotalWeight(trucks);
              const totalDiff = getTotalDifference(verification);
              
              return (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(report.dispatch_date), 'dd MMM yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>{report.dispatch_location}</TableCell>
                  <TableCell>{report.destination_buyer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.coffee_type}</Badge>
                  </TableCell>
                  <TableCell>{trucks.length}</TableCell>
                  <TableCell>{totalWeight.toLocaleString()} kg</TableCell>
                  <TableCell className={totalDiff !== 0 ? (totalDiff > 0 ? 'text-green-600' : 'text-destructive') : ''}>
                    {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(1)} kg
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.created_by_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Dispatch Comparison Report Details</DialogTitle>
                          </DialogHeader>
                          <DispatchReportDetail report={report} />
                        </DialogContent>
                      </Dialog>
                      
                      {report.attachment_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={report.attachment_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const DispatchReportDetail = ({ report }: { report: DispatchReport }) => {
  const trucks = Array.isArray(report.trucks) ? report.trucks : [];
  const verification = Array.isArray(report.buyer_verification) ? report.buyer_verification : [];
  const deductionReasons = Array.isArray(report.deduction_reasons) ? report.deduction_reasons : [];

  return (
    <div className="space-y-6">
      {/* Section A */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">A. Dispatch Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Date:</span>{' '}
            {format(new Date(report.dispatch_date), 'dd MMMM yyyy')}
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>{' '}
            {report.dispatch_location}
          </div>
          <div>
            <span className="text-muted-foreground">Coffee Type:</span>{' '}
            {report.coffee_type}
          </div>
          <div>
            <span className="text-muted-foreground">Buyer:</span>{' '}
            {report.destination_buyer}
          </div>
          <div>
            <span className="text-muted-foreground">Supervisor:</span>{' '}
            {report.dispatch_supervisor || 'N/A'}
          </div>
          <div>
            <span className="text-muted-foreground">Vehicles:</span>{' '}
            {report.vehicle_registrations || 'N/A'}
          </div>
        </CardContent>
      </Card>

      {/* Section B */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">B. Dispatch Summary (Per Truck)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead>Bags</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Traceability</TableHead>
                <TableHead>Batch Refs</TableHead>
                <TableHead>Quality Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{truck.truck_number}</TableCell>
                  <TableCell>{truck.total_bags_loaded}</TableCell>
                  <TableCell>{truck.total_weight_store?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={truck.traceability_confirmed ? 'default' : 'secondary'}>
                      {truck.traceability_confirmed ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{truck.lot_batch_references || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={truck.quality_report_attached ? 'default' : 'secondary'}>
                      {truck.quality_report_attached ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section C */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">C. Buyer Weighing & Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Buyer Bags</TableHead>
                <TableHead>Buyer Weight (kg)</TableHead>
                <TableHead>Store Weight (kg)</TableHead>
                <TableHead>Difference (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verification.map((v, index) => (
                <TableRow key={index}>
                  <TableCell>{v.truck_number}</TableCell>
                  <TableCell>{v.buyer_bags_count}</TableCell>
                  <TableCell>{v.buyer_weight?.toLocaleString()}</TableCell>
                  <TableCell>{v.store_weight?.toLocaleString()}</TableCell>
                  <TableCell className={v.difference !== 0 ? (v.difference > 0 ? 'text-green-600' : 'text-destructive') : ''}>
                    {v.difference > 0 ? '+' : ''}{v.difference?.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section D */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">D. Buyer Quality Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Quality Checked by Buyer:</span>{' '}
            <Badge variant={report.quality_checked_by_buyer ? 'default' : 'secondary'}>
              {report.quality_checked_by_buyer ? 'Yes' : 'No'}
            </Badge>
          </div>
          {report.buyer_quality_remarks && (
            <div>
              <span className="text-muted-foreground">Remarks:</span>{' '}
              {report.buyer_quality_remarks}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section E */}
      {(report.bags_deducted > 0 || deductionReasons.length > 0) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">E. Bag & Weight Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Bags Deducted:</span>{' '}
              {report.bags_deducted}
            </div>
            <div>
              <span className="text-muted-foreground">Total Deducted Weight:</span>{' '}
              {report.total_deducted_weight} kg
            </div>
            <div>
              <span className="text-muted-foreground">Reasons:</span>{' '}
              {deductionReasons.join(', ') || 'N/A'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section F */}
      {report.remarks && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">F. Remarks & Observations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {report.remarks}
          </CardContent>
        </Card>
      )}

      {/* Attachment */}
      {report.attachment_url && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Attachment</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href={report.attachment_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                {report.attachment_name || 'Download Attachment'}
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        Submitted by {report.created_by_name} on {format(new Date(report.created_at), 'dd MMM yyyy HH:mm')}
      </div>
    </div>
  );
};

export default EUDRDispatchReportsList;
