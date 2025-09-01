import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { SalaryPayslip } from '@/hooks/useCompanyEmployees';
import jsPDF from 'jspdf';

interface PayslipGeneratorProps {
  payslips: SalaryPayslip[];
  onGeneratePayslips: (month: number, year: number) => Promise<SalaryPayslip[]>;
  loading: boolean;
}

const PayslipGenerator = ({ payslips, onGeneratePayslips, loading }: PayslipGeneratorProps) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleGeneratePayslips = async () => {
    setGenerating(true);
    try {
      await onGeneratePayslips(selectedMonth, selectedYear);
    } catch (error) {
      console.error('Error generating payslips:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPayslip = async (payslip: SalaryPayslip) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = 20;

      // Company Logo (if available)
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = '/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png';
        
        await new Promise((resolve, reject) => {
          logoImg.onload = () => resolve(logoImg);
          logoImg.onerror = () => resolve(null); // Continue without logo if it fails
        });

        if (logoImg.complete) {
          pdf.addImage(logoImg, 'PNG', pageWidth / 2 - 15, currentY, 30, 15);
          currentY += 25;
        }
      } catch (error) {
        console.log('Logo not loaded, continuing without it');
        currentY += 10;
      }

      // Company Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GREAT PEARL COFFEE FACTORY', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Specialty Coffee Processing & Export', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      pdf.text('+256781121639 / +256778536681', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      pdf.text('www.greatpearlcoffee.com | greatpearlcoffee@gmail.com', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      pdf.text('Uganda Coffee Development Authority Licensed', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Horizontal line
      pdf.setLineWidth(1);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 15;

      // Payslip Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SALARY PAYSLIP', pageWidth / 2, currentY, { align: 'center' });
      currentY += 20;

      // Employee Details Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EMPLOYEE DETAILS', margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Employee Name: ${payslip.employee_name}`, margin, currentY);
      currentY += 8;
      pdf.text(`Employee ID: ${payslip.employee_id_number}`, margin, currentY);
      currentY += 8;
      pdf.text(`Pay Period: ${months.find(m => m.value === payslip.pay_period_month)?.label} ${payslip.pay_period_year}`, margin, currentY);
      currentY += 8;
      pdf.text(`Generated Date: ${format(new Date(payslip.generated_date), 'dd/MM/yyyy')}`, margin, currentY);
      currentY += 20;

      // Earnings Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EARNINGS', margin, currentY);
      currentY += 10;

      // Earnings Table
      const earningsData = [
        ['Description', 'Amount (UGX)'],
        ['Base Salary', payslip.base_salary.toLocaleString()],
        ['Allowances', payslip.allowances.toLocaleString()],
        ['GROSS SALARY', payslip.gross_salary.toLocaleString()]
      ];

      let tableY = currentY;
      const colWidth = (pageWidth - 2 * margin) / 2;

      earningsData.forEach((row, index) => {
        if (index === 0 || index === earningsData.length - 1) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
        }

        // Draw table borders
        pdf.rect(margin, tableY - 5, colWidth, 10);
        pdf.rect(margin + colWidth, tableY - 5, colWidth, 10);

        pdf.text(row[0], margin + 5, tableY);
        pdf.text(row[1], margin + colWidth + 5, tableY);
        tableY += 10;
      });

      currentY = tableY + 15;

      // Deductions Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DEDUCTIONS', margin, currentY);
      currentY += 10;

      // Deductions Table
      const deductionsData = [
        ['Description', 'Amount (UGX)'],
        ['Total Deductions', payslip.deductions.toLocaleString()]
      ];

      tableY = currentY;

      deductionsData.forEach((row, index) => {
        if (index === 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
        }

        // Draw table borders
        pdf.rect(margin, tableY - 5, colWidth, 10);
        pdf.rect(margin + colWidth, tableY - 5, colWidth, 10);

        pdf.text(row[0], margin + 5, tableY);
        pdf.text(row[1], margin + colWidth + 5, tableY);
        tableY += 10;
      });

      currentY = tableY + 20;

      // Net Salary (Highlighted)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.rect(margin, currentY - 8, pageWidth - 2 * margin, 15);
      pdf.text(`NET SALARY: UGX ${payslip.net_salary.toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 25;

      // Signatures Section
      currentY += 20;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Employee Signature
      pdf.text('Employee Signature: ____________________', margin, currentY);
      pdf.text('Date: ____________________', margin, currentY + 15);
      
      // HR Signature
      pdf.text('HR Manager Signature: ____________________', margin + 100, currentY);
      pdf.text('Date: ____________________', margin + 100, currentY + 15);

      // Footer
      currentY += 40;
      pdf.setFontSize(8);
      pdf.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, currentY, { align: 'center' });
      pdf.text('For queries, contact HR Department.', pageWidth / 2, currentY + 5, { align: 'center' });

      // Save the PDF
      const fileName = `Payslip_${payslip.employee_id_number}_${months.find(m => m.value === payslip.pay_period_month)?.label}_${payslip.pay_period_year}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to simple text download
      const payslipContent = `
SALARY PAYSLIP
==============

Employee: ${payslip.employee_name}
Employee ID: ${payslip.employee_id_number}
Pay Period: ${months.find(m => m.value === payslip.pay_period_month)?.label} ${payslip.pay_period_year}
Generated: ${format(new Date(payslip.generated_date), 'MMM dd, yyyy')}

EARNINGS:
---------
Base Salary:     UGX ${payslip.base_salary.toLocaleString()}
Allowances:      UGX ${payslip.allowances.toLocaleString()}
Gross Salary:    UGX ${payslip.gross_salary.toLocaleString()}

DEDUCTIONS:
-----------
Total Deductions: UGX ${payslip.deductions.toLocaleString()}

NET SALARY:      UGX ${payslip.net_salary.toLocaleString()}
`;

      const blob = new Blob([payslipContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payslip.employee_id_number}_${payslip.pay_period_month}_${payslip.pay_period_year}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredPayslips = payslips.sort((a, b) => {
    if (a.pay_period_year !== b.pay_period_year) {
      return b.pay_period_year - a.pay_period_year;
    }
    return b.pay_period_month - a.pay_period_month;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Monthly Payslips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGeneratePayslips}
              disabled={generating}
              className="mt-6"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Payslips'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payslips generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                        {payslip.employee_name}
                      </TableCell>
                      <TableCell>{payslip.employee_id_number}</TableCell>
                      <TableCell>
                        {months.find(m => m.value === payslip.pay_period_month)?.label} {payslip.pay_period_year}
                      </TableCell>
                      <TableCell>UGX {payslip.base_salary.toLocaleString()}</TableCell>
                      <TableCell>UGX {payslip.allowances.toLocaleString()}</TableCell>
                      <TableCell>UGX {payslip.deductions.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        UGX {payslip.net_salary.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{payslip.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payslip.generated_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPayslip(payslip)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipGenerator;