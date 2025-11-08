import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Users, ShoppingCart, AlertCircle, MapPin } from 'lucide-react';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';

interface FieldDashboardProps {
  onNavigate: (section: string) => void;
}

export const FieldDashboard = ({ onNavigate }: FieldDashboardProps) => {
  const { dailyReports, purchases, facilitationRequests, attendanceLogs } = useFieldOperationsData();

  const todayReport = dailyReports.find(r => isToday(new Date(r.report_date)));
  const pendingReports = !todayReport;
  
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weeklyKgs = purchases
    .filter(p => {
      const date = new Date(p.purchase_date);
      return date >= weekStart && date <= weekEnd;
    })
    .reduce((sum, p) => sum + p.kgs_purchased, 0);

  const pendingFacilitation = facilitationRequests.filter(r => r.status === 'Pending').length;
  
  const todayAttendance = attendanceLogs.find(log => 
    isToday(new Date(log.date)) && !log.check_out_time
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Report</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingReports ? (
                <span className="text-destructive">Not Submitted</span>
              ) : (
                <span className="text-green-600">Submitted</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Kgs Sourced</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyKgs.toLocaleString()} kg</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Facilitation</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFacilitation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Status</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAttendance ? (
                <span className="text-green-600">Checked In</span>
              ) : (
                <span className="text-muted-foreground">Not Checked In</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button onClick={() => onNavigate('purchase')} className="h-20">
              <ShoppingCart className="mr-2 h-5 w-5" />
              New Purchase
            </Button>
            <Button onClick={() => onNavigate('report')} variant="secondary" className="h-20">
              <ClipboardList className="mr-2 h-5 w-5" />
              Daily Report
            </Button>
            <Button onClick={() => onNavigate('farmers')} variant="outline" className="h-20">
              <Users className="mr-2 h-5 w-5" />
              Farmer Lookup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Items Alert */}
      {pendingReports && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You have not submitted today's daily report yet.</p>
            <Button onClick={() => onNavigate('report')} variant="destructive">
              Submit Daily Report Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
