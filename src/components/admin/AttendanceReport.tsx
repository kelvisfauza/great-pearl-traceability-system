import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceReportData {
  employee_name: string;
  employee_email: string;
  days_present: number;
  days_absent: number;
  total_allowance: number;
}

export const AttendanceReport = () => {
  const [reportType, setReportType] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportData[]>([]);
  const { toast } = useToast();

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (reportType === 'week') {
        // Get current week (Monday to Sunday)
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
      } else {
        // Get current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by employee and calculate stats
      const employeeStats = new Map<string, AttendanceReportData>();

      attendanceData?.forEach((record) => {
        const key = record.employee_email;
        if (!employeeStats.has(key)) {
          employeeStats.set(key, {
            employee_name: record.employee_name,
            employee_email: record.employee_email,
            days_present: 0,
            days_absent: 0,
            total_allowance: 0
          });
        }

        const stats = employeeStats.get(key)!;
        if (record.status === 'present') {
          stats.days_present++;
          stats.total_allowance += 2500;
        } else if (record.status === 'absent') {
          stats.days_absent++;
        }
      });

      setReportData(Array.from(employeeStats.values()));
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const generatePrintableReport = () => {
    const now = new Date();
    const reportTitle = reportType === 'week' ? 'Weekly Attendance Report' : 'Monthly Attendance Report';
    const reportPeriod = reportType === 'week' 
      ? `Week of ${now.toLocaleDateString()}`
      : `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

    const totalPresent = reportData.reduce((sum, emp) => sum + emp.days_present, 0);
    const totalAbsent = reportData.reduce((sum, emp) => sum + emp.days_absent, 0);
    const totalAllowance = reportData.reduce((sum, emp) => sum + emp.total_allowance, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle} - ${reportPeriod}</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #8B4513;
          }
          .logo {
            font-size: 28pt;
            font-weight: bold;
            color: #8B4513;
            margin-bottom: 5px;
          }
          .company-name {
            font-size: 16pt;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 3px;
          }
          .subtitle {
            font-size: 10pt;
            color: #666;
          }
          .report-info {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #8B4513;
          }
          .report-info h2 {
            font-size: 14pt;
            color: #2c3e50;
            margin-bottom: 5px;
          }
          .report-info p {
            font-size: 10pt;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          thead {
            background: #8B4513;
            color: white;
          }
          th {
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
            border: 1px solid #ddd;
          }
          td {
            padding: 10px 8px;
            border: 1px solid #ddd;
            font-size: 10pt;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fa;
          }
          tbody tr:hover {
            background: #e9ecef;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .summary {
            background: #fff3cd;
            padding: 15px;
            margin-top: 20px;
            border-left: 4px solid #8B4513;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 10px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-label {
            font-size: 9pt;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 14pt;
            font-weight: bold;
            color: #2c3e50;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            display: flex;
            justify-content: space-between;
          }
          .signatures {
            margin-top: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 5px;
            font-size: 9pt;
            text-align: center;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">☕</div>
          <div class="company-name">Great Pearl Coffee Factory</div>
          <div class="subtitle">Coffee Management System</div>
        </div>

        <div class="report-info">
          <h2>${reportTitle}</h2>
          <p><strong>Period:</strong> ${reportPeriod}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Employees:</strong> ${reportData.length}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 30%">Employee Name</th>
              <th style="width: 25%">Email</th>
              <th class="text-center" style="width: 12%">Days Present</th>
              <th class="text-center" style="width: 12%">Days Absent</th>
              <th class="text-right" style="width: 16%">Total Allowance</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map((emp, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${emp.employee_name}</td>
                <td>${emp.employee_email}</td>
                <td class="text-center">${emp.days_present}</td>
                <td class="text-center">${emp.days_absent}</td>
                <td class="text-right"><strong>UGX ${emp.total_allowance.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3 style="margin-bottom: 10px; color: #2c3e50;">Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Days Present</div>
              <div class="summary-value" style="color: #28a745;">${totalPresent}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Days Absent</div>
              <div class="summary-value" style="color: #dc3545;">${totalAbsent}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Allowances</div>
              <div class="summary-value" style="color: #8B4513;">UGX ${totalAllowance.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div>
            <div class="signature-line">
              HR Manager Signature
            </div>
          </div>
          <div>
            <div class="signature-line">
              Administrator Signature
            </div>
          </div>
        </div>

        <div class="footer">
          <div>
            <strong>Great Pearl Coffee Factory</strong><br>
            Coffee Management System
          </div>
          <div style="text-align: right;">
            Page 1 of 1<br>
            Generated: ${new Date().toLocaleDateString()}
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Attendance Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Report Period</Label>
            <Select value={reportType} onValueChange={(value: 'week' | 'month') => setReportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Current Week</SelectItem>
                <SelectItem value="month">Current Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generatePrintableReport} disabled={loading || reportData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        {reportData.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Employee</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Present</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Absent</th>
                  <th className="px-4 py-2 text-right text-sm font-medium">Allowance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((emp, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{emp.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{emp.employee_email}</div>
                    </td>
                    <td className="px-4 py-2 text-center text-green-600 font-medium">{emp.days_present}</td>
                    <td className="px-4 py-2 text-center text-red-600 font-medium">{emp.days_absent}</td>
                    <td className="px-4 py-2 text-right font-medium">UGX {emp.total_allowance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No attendance data for this period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};