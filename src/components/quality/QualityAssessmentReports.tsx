import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Calendar, Filter, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QualityAssessmentReportsProps {
  assessments: any[];
}

const QualityAssessmentReports = ({ assessments }: QualityAssessmentReportsProps) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    coffeeType: '',
    status: '',
    reportType: 'detailed',
    groupBy: 'date'
  });
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  console.log('QualityAssessmentReports render:', { assessments: assessments?.length || 0 });

  // Ensure assessments is an array and has valid data
  const safeAssessments = Array.isArray(assessments) ? assessments : [];

  // Filter assessments based on criteria
  const filteredAssessments = safeAssessments.filter(assessment => {
    if (!assessment) return false;
    if (filters.startDate && assessment.date_assessed && new Date(assessment.date_assessed) < new Date(filters.startDate)) return false;
    if (filters.endDate && assessment.date_assessed && new Date(assessment.date_assessed) > new Date(filters.endDate)) return false;
    if (filters.supplier && assessment.supplier_name !== filters.supplier) return false;
    if (filters.coffeeType && assessment.coffee_type !== filters.coffeeType) return false;
    if (filters.status && assessment.status !== filters.status) return false;
    return true;
  });

  // Get unique values for filters
  const uniqueSuppliers = [...new Set(safeAssessments.map(a => a?.supplier_name || 'Unknown'))].filter(Boolean);
  const uniqueCoffeeTypes = [...new Set(safeAssessments.map(a => a?.coffee_type || 'Unknown'))].filter(Boolean);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAssessmentSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAssessments(prev => [...prev, id]);
    } else {
      setSelectedAssessments(prev => prev.filter(assessmentId => assessmentId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssessments(filteredAssessments.map(a => a.id));
    } else {
      setSelectedAssessments([]);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const reportData = selectedAssessments.length > 0 
        ? filteredAssessments.filter(a => selectedAssessments.includes(a.id))
        : filteredAssessments;

      if (reportData.length === 0) {
        toast({
          title: "No Data",
          description: "No assessments match the selected criteria.",
          variant: "destructive"
        });
        return;
      }

      // Generate comprehensive report
      await generatePrintableReport(reportData);

      toast({
        title: "Report Generated",
        description: `Successfully generated report for ${reportData.length} assessments.`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePrintableReport = async (data: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportTitle = `Quality Assessment Report - ${filters.reportType.charAt(0).toUpperCase() + filters.reportType.slice(1)}`;
    const dateRange = filters.startDate && filters.endDate 
      ? `${filters.startDate} to ${filters.endDate}`
      : 'All Dates';

    let reportContent = '';

    if (filters.reportType === 'summary') {
      reportContent = generateSummaryReport(data);
    } else if (filters.reportType === 'detailed') {
      reportContent = generateDetailedReport(data);
    } else if (filters.reportType === 'monthly') {
      reportContent = generateMonthlyReport(data);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .logo { width: 100px; height: auto; margin-bottom: 10px; }
          .filters { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .stat-card { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .reject { color: #e11d48; font-weight: bold; }
          .accept { color: #16a34a; font-weight: bold; }
          .calculation-details { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
          @media print { 
            body { margin: 20px; } 
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="Company Logo" class="logo">
          <h1>${reportTitle}</h1>
          <p><strong>Period:</strong> ${dateRange}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Assessments:</strong> ${data.length}</p>
        </div>

        <div class="filters">
          <h3>Report Filters</h3>
          <p><strong>Date Range:</strong> ${dateRange}</p>
          ${filters.supplier ? `<p><strong>Supplier:</strong> ${filters.supplier}</p>` : ''}
          ${filters.coffeeType ? `<p><strong>Coffee Type:</strong> ${filters.coffeeType}</p>` : ''}
          ${filters.status ? `<p><strong>Status:</strong> ${filters.status}</p>` : ''}
          <p><strong>Report Type:</strong> ${filters.reportType}</p>
        </div>

        ${reportContent}

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const generateSummaryReport = (data: any[]) => {
    const totalAssessments = data.length;
    const acceptedAssessments = data.filter(d => !d.reject_final).length;
    const rejectedAssessments = data.filter(d => d.reject_final).length;
    const avgOutturn = totalAssessments > 0 ? data.reduce((sum, d) => sum + (typeof d.outturn === 'number' ? d.outturn : 0), 0) / totalAssessments : 0;
    const avgFinalPrice = totalAssessments > 0 ? data.reduce((sum, d) => sum + (d.final_price || 0), 0) / totalAssessments : 0;
    const totalKgs = data.reduce((sum, d) => sum + (d.kilograms || 0), 0);

    return `
      <div class="summary-stats">
        <div class="stat-card">
          <h4>Total Assessments</h4>
          <h2>${totalAssessments}</h2>
        </div>
        <div class="stat-card">
          <h4>Accepted</h4>
          <h2 class="accept">${acceptedAssessments}</h2>
        </div>
        <div class="stat-card">
          <h4>Rejected</h4>
          <h2 class="reject">${rejectedAssessments}</h2>
        </div>
        <div class="stat-card">
          <h4>Average Outturn</h4>
          <h2>${avgOutturn.toFixed(1)}%</h2>
        </div>
        <div class="stat-card">
          <h4>Average Final Price</h4>
          <h2>UGX ${avgFinalPrice.toLocaleString()}</h2>
        </div>
        <div class="stat-card">
          <h4>Total Weight</h4>
          <h2>${totalKgs.toLocaleString()} kg</h2>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Batch Number</th>
            <th>Supplier</th>
            <th>Coffee Type</th>
            <th>Weight (kg)</th>
            <th>Outturn (%)</th>
            <th>Final Price (UGX)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(assessment => `
            <tr>
              <td>${assessment.date_assessed || 'N/A'}</td>
              <td>${assessment.batch_number || 'N/A'}</td>
              <td>${assessment.supplier_name || 'N/A'}</td>
              <td>${assessment.coffee_type || 'N/A'}</td>
              <td>${(assessment.kilograms || 0).toLocaleString()}</td>
              <td>${typeof assessment.outturn === 'number' ? assessment.outturn.toFixed(1) : (assessment.outturn || 'N/A')}</td>
              <td>${(assessment.final_price || 0).toLocaleString()}</td>
              <td class="${assessment.reject_final ? 'reject' : 'accept'}">
                ${assessment.reject_final ? 'REJECTED' : 'ACCEPTED'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateDetailedReport = (data: any[]) => {
    return `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Batch</th>
            <th>Supplier</th>
            <th>Coffee Type</th>
            <th>Weight (kg)</th>
            <th>Moisture (%)</th>
            <th>GP1 (%)</th>
            <th>GP2 (%)</th>
            <th>Less-12 (%)</th>
            <th>FM (%)</th>
            <th>Clean D14</th>
            <th>Outturn</th>
            <th>Outturn Price</th>
            <th>Final Price</th>
            <th>Status</th>
            <th>Quality Note</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(assessment => `
            <tr>
              <td>${assessment.date_assessed || 'N/A'}</td>
              <td>${assessment.batch_number || 'N/A'}</td>
              <td>${assessment.supplier_name || 'N/A'}</td>
              <td>${assessment.coffee_type || 'N/A'}</td>
              <td>${(assessment.kilograms || 0).toLocaleString()}</td>
              <td>${(assessment.moisture || 0).toFixed(1)}</td>
              <td>${(assessment.group1_defects || 0).toFixed(1)}</td>
              <td>${(assessment.group2_defects || 0).toFixed(1)}</td>
              <td>${(assessment.below12 || 0).toFixed(1)}</td>
              <td>${(assessment.fm || 0).toFixed(1)}</td>
              <td>${(assessment.clean_d14 || 0).toFixed(1)}</td>
              <td>${typeof assessment.outturn === 'number' ? assessment.outturn.toFixed(1) : (assessment.outturn || 'N/A')}</td>
              <td>${(assessment.outturn_price || 0).toLocaleString()}</td>
              <td>${(assessment.final_price || 0).toLocaleString()}</td>
              <td class="${assessment.reject_final ? 'reject' : 'accept'}">
                ${assessment.reject_final ? 'REJECTED' : 'ACCEPTED'}
              </td>
              <td>${assessment.quality_note || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateMonthlyReport = (data: any[]) => {
    // Group by month
    const monthlyData = data.reduce((acc, assessment) => {
      const month = assessment.date_assessed ? new Date(assessment.date_assessed).toISOString().substring(0, 7) : 'Unknown'; // YYYY-MM
      if (!acc[month]) {
        acc[month] = {
          assessments: [],
          totalKgs: 0,
          totalValue: 0,
          accepted: 0,
          rejected: 0
        };
      }
      acc[month].assessments.push(assessment);
      acc[month].totalKgs += assessment.kilograms || 0;
      acc[month].totalValue += assessment.final_price || 0;
      if (assessment.reject_final) {
        acc[month].rejected++;
      } else {
        acc[month].accepted++;
      }
      return acc;
    }, {} as any);

    return `
      <h2>Monthly Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Total Assessments</th>
            <th>Accepted</th>
            <th>Rejected</th>
            <th>Total Weight (kg)</th>
            <th>Total Value (UGX)</th>
            <th>Avg Price/kg</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(monthlyData).map(([month, data]: [string, any]) => `
            <tr>
              <td>${month}</td>
              <td>${data.assessments.length}</td>
              <td class="accept">${data.accepted}</td>
              <td class="reject">${data.rejected}</td>
              <td>${data.totalKgs.toLocaleString()}</td>
              <td>${data.totalValue.toLocaleString()}</td>
              <td>${data.totalKgs > 0 ? (data.totalValue / data.totalKgs).toLocaleString() : 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Detailed Breakdown</h2>
      ${generateDetailedReport(data)}
    `;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quality Assessment Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={filters.supplier} onValueChange={(value) => handleFilterChange('supplier', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Suppliers</SelectItem>
                  {uniqueSuppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="coffeeType">Coffee Type</Label>
              <Select value={filters.coffeeType} onValueChange={(value) => handleFilterChange('coffeeType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {uniqueCoffeeTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={filters.reportType} onValueChange={(value) => handleFilterChange('reportType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Assessment Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedAssessments.length === filteredAssessments.length && filteredAssessments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="selectAll">
                  Select All ({filteredAssessments.length} assessments)
                </Label>
              </div>
              <Badge variant="outline">
                {selectedAssessments.length} selected
              </Badge>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Select</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Batch Number</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-left">Coffee Type</th>
                    <th className="p-2 text-left">Outturn</th>
                    <th className="p-2 text-left">Final Price</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map(assessment => (
                    <tr key={assessment.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedAssessments.includes(assessment.id)}
                          onCheckedChange={(checked) => handleAssessmentSelect(assessment.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-2">{assessment.date_assessed || 'N/A'}</td>
                      <td className="p-2">{assessment.batch_number || 'N/A'}</td>
                      <td className="p-2">{assessment.supplier_name || 'N/A'}</td>
                      <td className="p-2">{assessment.coffee_type || 'N/A'}</td>
                      <td className="p-2">
                        {typeof assessment.outturn === 'number' ? `${assessment.outturn.toFixed(1)}%` : (assessment.outturn || 'N/A')}
                      </td>
                      <td className="p-2">UGX {(assessment.final_price || 0).toLocaleString()}</td>
                      <td className="p-2">
                        <Badge variant={assessment.reject_final ? "destructive" : "default"}>
                          {assessment.reject_final ? 'REJECTED' : 'ACCEPTED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityAssessmentReports;