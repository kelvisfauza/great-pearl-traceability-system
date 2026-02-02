import Layout from "@/components/Layout";
import { FieldOperationsManagement } from "@/components/admin/FieldOperationsManagement";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFieldOperationsData } from "@/hooks/useFieldOperationsData";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createPrintVerification, getVerificationHtml, getVerificationStyles } from '@/utils/printVerification';

const FieldOperationsReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { farmers, purchases, dailyReports, facilitationRequests, attendanceLogs, loading } = useFieldOperationsData();

  const printReport = async () => {
    // Create verification record
    const { code, qrUrl } = await createPrintVerification({
      type: 'report',
      subtype: 'Field Operations Report',
      reference_no: `FIELD-${format(new Date(), 'yyyyMMdd')}`,
      meta: { farmersCount: farmers.length, purchasesCount: purchases.length }
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to print the report",
        variant: "destructive"
      });
      return;
    }

    const totalPurchases = purchases.reduce((sum, p) => sum + p.kgs_purchased, 0);
    const totalValue = purchases.reduce((sum, p) => sum + p.total_value, 0);
    const pendingFinancing = facilitationRequests.filter(r => r.status === 'Pending').length;
    const approvedFinancing = facilitationRequests.filter(r => r.status === 'Approved').length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Field Operations Report - ${format(new Date(), 'MMM dd, yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
            .stat-card .value { font-size: 24px; font-weight: bold; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section h2 { font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .badge-success { background-color: #d4edda; color: #155724; }
            .badge-warning { background-color: #fff3cd; color: #856404; }
            .badge-danger { background-color: #f8d7da; color: #721c24; }
            @media print {
              .no-print { display: none; }
              body { padding: 10px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Field Operations Report</h1>
            <p>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
            <p>Comprehensive overview of all field activities</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <h3>Total Farmers</h3>
              <div class="value">${farmers.length}</div>
              <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">Registered</p>
            </div>
            <div class="stat-card">
              <h3>Total Purchases</h3>
              <div class="value">${totalPurchases.toFixed(0)} kg</div>
              <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">${purchases.length} transactions</p>
            </div>
            <div class="stat-card">
              <h3>Total Value</h3>
              <div class="value">UGX ${totalValue.toLocaleString()}</div>
              <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">From purchases</p>
            </div>
            <div class="stat-card">
              <h3>Financing Requests</h3>
              <div class="value">${facilitationRequests.length}</div>
              <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">${pendingFinancing} pending, ${approvedFinancing} approved</p>
            </div>
          </div>

          <div class="section">
            <h2>Field Purchases (Recent 50)</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Coffee Type</th>
                  <th>Category</th>
                  <th>Kgs</th>
                  <th>Value (UGX)</th>
                  <th>Status</th>
                  <th>Agent</th>
                </tr>
              </thead>
              <tbody>
                ${purchases.slice(0, 50).map(p => `
                  <tr>
                    <td>${format(new Date(p.purchase_date), 'MMM dd')}</td>
                    <td>${p.farmer_name}</td>
                    <td>${p.coffee_type}</td>
                    <td>${p.category}</td>
                    <td>${p.kgs_purchased.toFixed(1)}</td>
                    <td>${p.total_value.toLocaleString()}</td>
                    <td><span class="badge ${p.status === 'approved' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
                    <td>${p.created_by}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Daily Reports</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>District</th>
                  <th>Villages</th>
                  <th>Farmers Visited</th>
                  <th>Kgs Mobilized</th>
                  <th>Submitted By</th>
                </tr>
              </thead>
              <tbody>
                ${dailyReports.map(r => `
                  <tr>
                    <td>${format(new Date(r.report_date), 'MMM dd, yyyy')}</td>
                    <td>${r.district}</td>
                    <td>${r.villages_visited}</td>
                    <td>${r.farmers_visited?.length || 0}</td>
                    <td>${r.total_kgs_mobilized.toFixed(1)} kg</td>
                    <td>${r.submitted_by}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Registered Farmers</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Village</th>
                  <th>Coffee Type</th>
                  <th>Total Purchases</th>
                  <th>Outstanding Advance</th>
                </tr>
              </thead>
              <tbody>
                ${farmers.map(f => `
                  <tr>
                    <td>${f.full_name}</td>
                    <td>${f.phone}</td>
                    <td>${f.village}</td>
                    <td>${f.coffee_type}</td>
                    <td>${f.total_purchases_kg.toFixed(1)} kg</td>
                    <td>${f.outstanding_advance > 0 ? 'UGX ' + f.outstanding_advance.toLocaleString() : 'Clear'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Financing Requests</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${facilitationRequests.map(r => `
                  <tr>
                    <td>${format(new Date(r.created_at), 'MMM dd')}</td>
                    <td>${r.details?.request_type || 'Field Financing'}</td>
                    <td>${r.description}</td>
                    <td>UGX ${r.amount.toLocaleString()}</td>
                    <td><span class="badge ${
                      r.status === 'Approved' ? 'badge-success' : 
                      r.status === 'Rejected' ? 'badge-danger' : 
                      'badge-warning'
                    }">${r.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Attendance Logs (Recent)</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agent</th>
                  <th>Location</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceLogs.slice(0, 50).map(log => `
                  <tr>
                    <td>${format(new Date(log.date), 'MMM dd')}</td>
                    <td>${log.field_agent}</td>
                    <td>${log.location_name || '-'}</td>
                    <td>${format(new Date(log.check_in_time), 'HH:mm')}</td>
                    <td>${log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm') : 'Active'}</td>
                    <td>${log.duration_minutes ? log.duration_minutes + ' min' : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${getVerificationHtml(code, qrUrl)}

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

  return (
    <Layout 
      title="Field Operations" 
      subtitle="Manage field operations and reports"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/reports")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <Button 
            onClick={printReport}
            disabled={loading}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
        <FieldOperationsManagement />
      </div>
    </Layout>
  );
};

export default FieldOperationsReport;
