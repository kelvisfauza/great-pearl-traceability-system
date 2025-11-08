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
  Package
} from 'lucide-react';

export const FieldOperationsManagement = () => {
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
      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
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
