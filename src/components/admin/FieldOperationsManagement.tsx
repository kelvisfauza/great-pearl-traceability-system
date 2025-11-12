import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { format } from 'date-fns';
import { 
  ShoppingCart, 
  Users, 
  FileText, 
  MapPin, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Package,
  BarChart3,
  Printer
} from 'lucide-react';
import { FieldOperationsAnalytics } from './FieldOperationsAnalytics';
import { useToast } from '@/hooks/use-toast';

export const FieldOperationsManagement = () => {
  const { toast } = useToast();
  const { 
    farmers, 
    purchases, 
    dailyReports, 
    facilitationRequests, 
    attendanceLogs,
    loading 
  } = useFieldOperationsData();

  // Calculate statistics
  const totalFarmers = farmers.length;
  const totalPurchases = purchases.reduce((sum, p) => sum + p.kgs_purchased, 0);
  const pendingFinancing = facilitationRequests.filter(r => r.status === 'Pending').length;
  const todayAttendance = attendanceLogs.filter(
    log => format(new Date(log.check_in_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;

  const printDailyReport = (report: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to print the report",
        variant: "destructive"
      });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Field Report - ${format(new Date(report.report_date), 'MMM dd, yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 40px; 
              color: #000;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 30px; 
            }
            .company-logo {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .company-tagline {
              font-size: 14px;
              color: #64748b;
              font-style: italic;
            }
            .report-title {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              margin: 20px 0 10px 0;
            }
            .report-date {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 5px;
            }
            .section {
              margin: 30px 0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 150px 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
            }
            .info-value {
              color: #1e293b;
            }
            .challenges-box {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .actions-box {
              background-color: #dbeafe;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .farmers-list {
              columns: 2;
              column-gap: 30px;
              margin: 15px 0;
            }
            .farmer-item {
              break-inside: avoid;
              padding: 5px 0;
            }
            .farmer-item:before {
              content: "• ";
              color: #2563eb;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 12px;
            }
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
            }
            .signature-line {
              border-top: 1px solid #000;
              padding-top: 8px;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-logo">☕</div>
            <div class="company-name">COFFEE MANAGEMENT SYSTEM</div>
            <div class="company-tagline">Excellence in Coffee Operations</div>
            <div class="report-title">Daily Field Operations Report</div>
            <div class="report-date">${format(new Date(report.report_date), 'EEEE, MMMM dd, yyyy')}</div>
          </div>

          <div class="section">
            <div class="section-title">Report Information</div>
            <div class="info-grid">
              <div class="info-label">Date:</div>
              <div class="info-value">${format(new Date(report.report_date), 'MMMM dd, yyyy')}</div>
              
              <div class="info-label">Submitted By:</div>
              <div class="info-value">${report.submitted_by}</div>
              
              <div class="info-label">District:</div>
              <div class="info-value">${report.district}</div>
              
              <div class="info-label">Villages Visited:</div>
              <div class="info-value">${report.villages_visited}</div>
              
              <div class="info-label">Report Submitted:</div>
              <div class="info-value">${format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Performance Metrics</div>
            <div class="info-grid">
              <div class="info-label">Farmers Visited:</div>
              <div class="info-value">${report.farmers_visited?.length || 0} farmers</div>
              
              <div class="info-label">Total KGs Mobilized:</div>
              <div class="info-value">${report.total_kgs_mobilized.toFixed(2)} kg</div>
            </div>
          </div>

          ${report.farmers_visited && report.farmers_visited.length > 0 ? `
            <div class="section">
              <div class="section-title">Farmers Visited</div>
              <div class="farmers-list">
                ${report.farmers_visited.map((farmer: string) => `
                  <div class="farmer-item">${farmer}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${report.challenges ? `
            <div class="section">
              <div class="section-title">Challenges Encountered</div>
              <div class="challenges-box">
                ${report.challenges}
              </div>
            </div>
          ` : ''}

          ${report.actions_needed_from_office ? `
            <div class="section">
              <div class="section-title">Actions Needed from Office</div>
              <div class="actions-box">
                ${report.actions_needed_from_office}
              </div>
            </div>
          ` : ''}

          <div class="signature-section">
            <div>
              <div class="signature-line">Field Officer Signature</div>
            </div>
            <div>
              <div class="signature-line">Supervisor Signature</div>
            </div>
          </div>

          <div class="footer">
            <p>This is an official report generated by the Coffee Management System</p>
            <p>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Field Operations Management</h2>
          <p className="text-muted-foreground">Monitor and manage all field activities</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading field operations data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Field Operations Management</h2>
        <p className="text-muted-foreground">Monitor and manage all field activities</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFarmers}</div>
            <p className="text-xs text-muted-foreground">Registered farmers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases.toFixed(0)} kg</div>
            <p className="text-xs text-muted-foreground">{purchases.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              Pending Financing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFinancing}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-500" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance}</div>
            <p className="text-xs text-muted-foreground">Checked in today</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchases
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="farmers">
            <Users className="h-4 w-4 mr-2" />
            Farmers
          </TabsTrigger>
          <TabsTrigger value="financing">
            <DollarSign className="h-4 w-4 mr-2" />
            Financing
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <MapPin className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Analytics Dashboard */}
        <TabsContent value="analytics">
          <FieldOperationsAnalytics />
        </TabsContent>

        {/* Field Purchases */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Field Purchases</CardTitle>
              <CardDescription>All coffee purchases made in the field</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Coffee Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Kgs</TableHead>
                    <TableHead>Value (UGX)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No purchases recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.slice(0, 50).map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{format(new Date(purchase.purchase_date), 'MMM dd')}</TableCell>
                        <TableCell className="font-medium">{purchase.farmer_name}</TableCell>
                        <TableCell>{purchase.coffee_type}</TableCell>
                        <TableCell>{purchase.category}</TableCell>
                        <TableCell>{purchase.kgs_purchased.toFixed(1)}</TableCell>
                        <TableCell>{purchase.total_value.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'approved' ? 'default' : 'secondary'}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{purchase.created_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Reports */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Daily Field Reports</CardTitle>
              <CardDescription>Reports submitted by field officers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Villages</TableHead>
                    <TableHead>Farmers Visited</TableHead>
                    <TableHead>Kgs Mobilized</TableHead>
                    <TableHead>Challenges</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No reports submitted yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{format(new Date(report.report_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-medium">{report.district}</TableCell>
                        <TableCell className="max-w-xs truncate">{report.villages_visited}</TableCell>
                        <TableCell>{report.farmers_visited?.length || 0}</TableCell>
                        <TableCell>{report.total_kgs_mobilized.toFixed(1)} kg</TableCell>
                        <TableCell className="max-w-xs truncate">{report.challenges || '-'}</TableCell>
                        <TableCell>{report.submitted_by}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printDailyReport(report)}
                            className="gap-2"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Farmers */}
        <TabsContent value="farmers">
          <Card>
            <CardHeader>
              <CardTitle>Registered Farmers</CardTitle>
              <CardDescription>Complete farmer database</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Coffee Type</TableHead>
                    <TableHead>Total Purchases (kg)</TableHead>
                    <TableHead>Outstanding Advance</TableHead>
                    <TableHead>Registered By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No farmers registered yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    farmers.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell className="font-medium">{farmer.full_name}</TableCell>
                        <TableCell>{farmer.phone}</TableCell>
                        <TableCell>{farmer.village}</TableCell>
                        <TableCell>{farmer.coffee_type}</TableCell>
                        <TableCell>{farmer.total_purchases_kg.toFixed(1)}</TableCell>
                        <TableCell>
                          {farmer.outstanding_advance > 0 ? (
                            <span className="text-orange-500 font-semibold">
                              UGX {farmer.outstanding_advance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-green-500">Clear</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{farmer.created_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financing Requests */}
        <TabsContent value="financing">
          <Card>
            <CardHeader>
              <CardTitle>Field Financing Requests</CardTitle>
              <CardDescription>All financing and facilitation requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilitationRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No financing requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    facilitationRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{format(new Date(request.created_at), 'MMM dd')}</TableCell>
                        <TableCell className="font-medium">
                          {request.details?.request_type || 'Field Financing'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                        <TableCell>UGX {request.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              request.status === 'Approved' ? 'default' : 
                              request.status === 'Rejected' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.finance_approved_by && `Finance: ${request.finance_approved_by}`}
                          {request.admin_approved_by && `, Admin: ${request.admin_approved_by}`}
                          {!request.finance_approved_by && !request.admin_approved_by && '-'}
                        </TableCell>
                        <TableCell>
                          {request.status === 'Pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7">
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Logs */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Field Agent Attendance</CardTitle>
              <CardDescription>Check-in/out logs and location tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No attendance logs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.date), 'MMM dd')}</TableCell>
                        <TableCell className="font-medium">{log.field_agent}</TableCell>
                        <TableCell>{log.location_name || '-'}</TableCell>
                        <TableCell>{format(new Date(log.check_in_time), 'HH:mm')}</TableCell>
                        <TableCell>
                          {log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : 'Active'}
                        </TableCell>
                        <TableCell>
                          {log.duration_minutes ? `${log.duration_minutes} min` : '-'}
                        </TableCell>
                        <TableCell>
                          {log.check_in_gps_latitude && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              GPS
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
