import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAttendance } from '@/hooks/useAttendance';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Calendar, Users, DollarSign, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AttendanceReport } from './AttendanceReport';

export const AttendanceManager = () => {
  const { attendance, loading: attendanceLoading, markAttendance, bulkMarkAttendance } = useAttendance();
  const { employees, loading: employeesLoading } = useUnifiedEmployees();
  const { toast } = useToast();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const today = new Date().toLocaleDateString();
  const activeEmployees = employees.filter(emp => emp.status === 'Active');

  const filteredEmployees = activeEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeAttendanceStatus = (employeeId: string) => {
    return attendance.find(a => a.employee_id === employeeId);
  };

  const handleMarkPresent = (employeeId: string, name: string, email: string) => {
    markAttendance(employeeId, name, email, 'present');
  };

  const handleMarkAbsent = (employeeId: string, name: string, email: string) => {
    markAttendance(employeeId, name, email, 'absent');
  };

  const handleBulkMarkPresent = () => {
    const selectedEmps = activeEmployees.filter(emp => selectedEmployees.includes(emp.id));
    bulkMarkAttendance(selectedEmployees, selectedEmps, 'present');
    setSelectedEmployees([]);
  };

  const handleBulkMarkAbsent = () => {
    const selectedEmps = activeEmployees.filter(emp => selectedEmployees.includes(emp.id));
    bulkMarkAttendance(selectedEmployees, selectedEmps, 'absent');
    setSelectedEmployees([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select employees who don't have locked attendance
      const selectableEmployees = filteredEmployees.filter(emp => {
        const attendanceStatus = getEmployeeAttendanceStatus(emp.id);
        return !attendanceStatus || !attendanceStatus.is_locked;
      });
      setSelectedEmployees(selectableEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    const attendanceStatus = getEmployeeAttendanceStatus(employeeId);
    // Prevent selecting locked records
    if (attendanceStatus?.is_locked) {
      toast({
        title: "Cannot Select",
        description: "This attendance record is already locked",
        variant: "destructive",
      });
      return;
    }

    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const notMarkedCount = activeEmployees.length - attendance.length;

  if (attendanceLoading || employeesLoading) {
    return <div>Loading attendance system...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <strong>Daily Allowance System:</strong> Each employee gets 3,333 UGX per day attended (20,000 UGX per 6-day week). 
          Mark attendance daily to calculate their eligible lunch/refreshment allowances automatically.
          <br />
          <strong>🔒 Lock Protection:</strong> Once marked, attendance is locked and cannot be changed by other admins to prevent manipulation.
        </AlertDescription>
      </Alert>

      <AttendanceReport />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentCount}</div>
            <p className="text-xs text-muted-foreground">UGX {(presentCount * 2500).toLocaleString()} eligible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentCount}</div>
            <p className="text-xs text-muted-foreground">No allowance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Marked</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notMarkedCount}</div>
            <p className="text-xs text-muted-foreground">Pending marking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">{today}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mark Attendance for {today}
          </CardTitle>
          <CardDescription>
            Mark who is present/absent today. This automatically calculates their weekly lunch allowance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedEmployees.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={handleBulkMarkPresent} size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark {selectedEmployees.length} Present
                  </Button>
                  <Button onClick={handleBulkMarkAbsent} size="sm" variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark {selectedEmployees.length} Absent
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Daily Allowance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const attendanceStatus = getEmployeeAttendanceStatus(emp.id);
                    return (
                      <TableRow key={emp.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={(checked) => handleSelectEmployee(emp.id, checked as boolean)}
                          disabled={attendanceStatus?.is_locked}
                        />
                      </TableCell>
                        <TableCell>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          {attendanceStatus ? (
                            <div className="space-y-1">
                              <Badge variant={
                                attendanceStatus.status === 'present' ? 'default' :
                                attendanceStatus.status === 'absent' ? 'destructive' : 'secondary'
                              }>
                                {attendanceStatus.status}
                              </Badge>
                              {attendanceStatus.is_locked && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  🔒 Locked by {attendanceStatus.locked_by}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">Not Marked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {attendanceStatus?.status === 'present' ? (
                            <span className="text-green-600 font-medium">+2,500 UGX</span>
                          ) : (
                            <span className="text-muted-foreground">0 UGX</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {attendanceStatus?.is_locked ? (
                            <Badge variant="secondary" className="text-xs">
                              🔒 Locked
                            </Badge>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant={attendanceStatus?.status === 'present' ? 'default' : 'outline'}
                                onClick={() => handleMarkPresent(emp.id, emp.name, emp.email)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={attendanceStatus?.status === 'absent' ? 'destructive' : 'outline'}
                                onClick={() => handleMarkAbsent(emp.id, emp.name, emp.email)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};