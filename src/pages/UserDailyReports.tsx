import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyReportForm } from '@/components/reports/DailyReportForm';
import { StaffReportsPrint } from '@/components/reports/StaffReportsPrint';
import { FileText, Plus, Search, Calendar, User, Building2, Clock, Eye, Printer, Filter } from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { getQuestionsForDepartment } from '@/config/departmentReportQuestions';

interface DailyReport {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  report_date: string;
  report_data: Record<string, any>;
  status: string;
  submitted_at: string;
  created_at: string;
}

const UserDailyReports = () => {
  const { employee, isAdmin } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [allReports, setAllReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [activeTab, setActiveTab] = useState('my-reports');
  
  // Date filtering
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const fetchMyReports = async () => {
    if (!employee) return;

    const { data, error } = await supabase
      .from('employee_daily_reports')
      .select('*')
      .eq('employee_id', employee.id)
      .order('report_date', { ascending: false });

    if (!error && data) {
      setReports(data as DailyReport[]);
    }
  };

  const fetchAllReports = async () => {
    if (!isAdmin()) return;

    let query = supabase
      .from('employee_daily_reports')
      .select('*')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('employee_id', selectedEmployee);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAllReports(data as DailyReport[]);
    }
  };

  const fetchEmployees = async () => {
    if (!isAdmin()) return;
    
    const { data } = await supabase
      .from('employees')
      .select('id, name')
      .eq('status', 'Active')
      .order('name');
    
    if (data) {
      setEmployees(data);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchMyReports(), fetchAllReports(), fetchEmployees()]);
      setLoading(false);
    };

    fetchData();
  }, [employee]);

  // Refetch when filters change
  useEffect(() => {
    if (isAdmin()) {
      fetchAllReports();
    }
  }, [startDate, endDate, selectedEmployee]);

  const filteredReports = reports.filter(report =>
    report.report_date.includes(searchTerm) ||
    report.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllReports = allReports.filter(report =>
    report.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.report_date.includes(searchTerm)
  );

  const renderReportCard = (report: DailyReport, showEmployee = false) => (
    <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport(report)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(parseISO(report.report_date), 'MMMM d, yyyy')}</span>
            </div>
            {showEmployee && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                {report.employee_name}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {report.department}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Submitted at {format(parseISO(report.submitted_at), 'h:mm a')}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {report.status}
            </Badge>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReportDetail = (report: DailyReport) => {
    const questions = getQuestionsForDepartment(report.department);
    
    return (
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Daily Report - {report.department}
            </DialogTitle>
            <DialogDescription>
              {report.employee_name} • {format(parseISO(report.report_date), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {questions.map((question) => {
                const value = report.report_data[question.id];
                if (value === undefined || value === '' || value === null) return null;

                return (
                  <div key={question.id} className="border-b pb-3">
                    <p className="text-sm font-medium text-muted-foreground">{question.label}</p>
                    <p className="mt-1">{value}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Layout title="User Daily Reports" subtitle="View and manage daily activity reports">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowNewReportForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-reports">My Reports</TabsTrigger>
            {isAdmin() && <TabsTrigger value="all-reports">All Reports</TabsTrigger>}
          </TabsList>

          <TabsContent value="my-reports" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
            ) : filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No reports found</p>
                  <Button className="mt-4" onClick={() => setShowNewReportForm(true)}>
                    Create Your First Report
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredReports.map((report) => renderReportCard(report))}
              </div>
            )}
          </TabsContent>

          {isAdmin() && (
            <TabsContent value="all-reports" className="mt-4 space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">Employee</label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All Employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPrintDialog(true)}
                      disabled={filteredAllReports.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Reports ({filteredAllReports.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
              ) : filteredAllReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No reports found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAllReports.map((report) => renderReportCard(report, true))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Report Form */}
        <DailyReportForm
          open={showNewReportForm}
          onOpenChange={setShowNewReportForm}
          onSuccess={() => {
            fetchMyReports();
            fetchAllReports();
          }}
        />

        {/* Report Detail View */}
        {selectedReport && renderReportDetail(selectedReport)}

        {/* Print Dialog */}
        <StaffReportsPrint
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          reports={filteredAllReports}
          startDate={startDate}
          endDate={endDate}
          employeeName={selectedEmployee !== 'all' ? employees.find(e => e.id === selectedEmployee)?.name : undefined}
        />
      </div>
    </Layout>
  );
};

export default UserDailyReports;
