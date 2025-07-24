import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseEmployees } from "@/hooks/useFirebaseEmployees";
import { useToast } from "@/hooks/use-toast";
import { Printer, FileText } from "lucide-react";

interface ContractGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContractGenerator = ({ isOpen, onClose }: ContractGeneratorProps) => {
  const { employees } = useFirebaseEmployees();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    employeeId: "",
    contractType: "Permanent",
    startDate: "",
    endDate: "",
    probationPeriod: "3",
    workingHours: "8",
    basicSalary: "",
    allowances: "",
    annualLeave: "21",
    sickLeave: "7",
    maternityLeave: "90",
    noticePeriod: "30",
    overtimeRate: "1.5",
    workLocation: "Head Office",
    reportingTo: "",
    jobDescription: "",
    benefits: "",
    termConditions: "",
    additionalTerms: ""
  });

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  const generateContract = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const contractHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employment Contract - ${selectedEmployee.name}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 30px; line-height: 1.6; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .company-address { font-size: 14px; color: #666; }
          .contract-title { font-size: 22px; font-weight: bold; margin: 30px 0; text-align: center; text-decoration: underline; }
          .parties { margin-bottom: 30px; }
          .party { margin-bottom: 15px; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; text-decoration: underline; }
          .clause { margin-bottom: 15px; text-align: justify; }
          .clause-number { font-weight: bold; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .signature { border-top: 1px solid #000; padding-top: 10px; width: 250px; text-align: center; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f5f5f5; font-weight: bold; }
          @media print { body { margin: 15px; } .signature-section { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="Great Pearl Coffee Factory" style="height: 100px; width: 100px; margin-right: 30px;">
            <div>
              <div class="company-name">GREAT PEARL COFFEE FACTORY</div>
              <div class="company-address">
                P.O. Box 12345, Kampala, Uganda<br>
                Registration No: 123456789<br>
                Tel: +256 123 456 789 | Email: info@greatpearlcoffee.com
              </div>
            </div>
          </div>
        </div>

        <div class="contract-title">EMPLOYMENT CONTRACT</div>

        <div class="parties">
          <div class="party">
            <strong>EMPLOYER:</strong> Great Pearl Coffee Factory, a company incorporated under the laws of Uganda with its registered office at P.O. Box 12345, Kampala, Uganda (hereinafter referred to as "the Company").
          </div>
          <div class="party">
            <strong>EMPLOYEE:</strong> ${selectedEmployee.name}, of ${selectedEmployee.address || '[Address]'} (hereinafter referred to as "the Employee").
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. EMPLOYMENT DETAILS</div>
          
          <table class="table">
            <tr>
              <th>Position:</th>
              <td>${selectedEmployee.position}</td>
            </tr>
            <tr>
              <th>Department:</th>
              <td>${selectedEmployee.department}</td>
            </tr>
            <tr>
              <th>Contract Type:</th>
              <td>${formData.contractType}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>${new Date(formData.startDate).toLocaleDateString()}</td>
            </tr>
            ${formData.contractType === 'Fixed Term' ? `
            <tr>
              <th>End Date:</th>
              <td>${new Date(formData.endDate).toLocaleDateString()}</td>
            </tr>
            ` : ''}
            <tr>
              <th>Probation Period:</th>
              <td>${formData.probationPeriod} months</td>
            </tr>
            <tr>
              <th>Work Location:</th>
              <td>${formData.workLocation}</td>
            </tr>
            <tr>
              <th>Reporting To:</th>
              <td>${formData.reportingTo}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">2. JOB DESCRIPTION AND DUTIES</div>
          <div class="clause">
            <span class="clause-number">2.1</span> The Employee shall perform the duties and responsibilities of ${selectedEmployee.position} in the ${selectedEmployee.department} department.
          </div>
          ${formData.jobDescription ? `
          <div class="clause">
            <span class="clause-number">2.2</span> Specific duties include: ${formData.jobDescription}
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">3. WORKING HOURS</div>
          <div class="clause">
            <span class="clause-number">3.1</span> Normal working hours shall be ${formData.workingHours} hours per day, Monday to Friday.
          </div>
          <div class="clause">
            <span class="clause-number">3.2</span> Overtime shall be paid at ${formData.overtimeRate}x the normal hourly rate for work exceeding normal hours.
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. REMUNERATION AND BENEFITS</div>
          
          <table class="table">
            <tr>
              <th>Basic Salary (Monthly):</th>
              <td>UGX ${parseFloat(formData.basicSalary || '0').toLocaleString()}</td>
            </tr>
            ${formData.allowances ? `
            <tr>
              <th>Allowances:</th>
              <td>UGX ${parseFloat(formData.allowances).toLocaleString()}</td>
            </tr>
            ` : ''}
          </table>

          ${formData.benefits ? `
          <div class="clause">
            <span class="clause-number">4.1</span> Additional benefits: ${formData.benefits}
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">5. LEAVE ENTITLEMENTS</div>
          
          <table class="table">
            <tr>
              <th>Annual Leave:</th>
              <td>${formData.annualLeave} working days per year</td>
            </tr>
            <tr>
              <th>Sick Leave:</th>
              <td>${formData.sickLeave} days per year</td>
            </tr>
            <tr>
              <th>Maternity Leave:</th>
              <td>${formData.maternityLeave} days (as per Uganda law)</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">6. TERMINATION</div>
          <div class="clause">
            <span class="clause-number">6.1</span> Either party may terminate this contract by giving ${formData.noticePeriod} days written notice.
          </div>
          <div class="clause">
            <span class="clause-number">6.2</span> The Company may terminate this contract immediately without notice for gross misconduct.
          </div>
          ${formData.termConditions ? `
          <div class="clause">
            <span class="clause-number">6.3</span> Additional termination conditions: ${formData.termConditions}
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">7. CONFIDENTIALITY</div>
          <div class="clause">
            <span class="clause-number">7.1</span> The Employee shall maintain strict confidentiality regarding all Company information, trade secrets, and client data.
          </div>
        </div>

        <div class="section">
          <div class="section-title">8. GOVERNING LAW</div>
          <div class="clause">
            <span class="clause-number">8.1</span> This contract shall be governed by the laws of Uganda.
          </div>
        </div>

        ${formData.additionalTerms ? `
        <div class="section">
          <div class="section-title">9. ADDITIONAL TERMS</div>
          <div class="clause">
            ${formData.additionalTerms}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="clause">
            By signing below, both parties agree to the terms and conditions set forth in this employment contract.
          </div>
          <div class="clause">
            <strong>Date:</strong> ${new Date().toLocaleDateString()}
          </div>
        </div>

        <div class="signature-section">
          <div class="signature">
            <div><strong>FOR THE COMPANY</strong></div>
            <div style="height: 40px;"></div>
            <div>_________________________</div>
            <div>HR Manager</div>
            <div>Great Pearl Coffee Factory</div>
          </div>
          <div class="signature">
            <div><strong>EMPLOYEE</strong></div>
            <div style="height: 40px;"></div>
            <div>_________________________</div>
            <div>${selectedEmployee.name}</div>
            <div>Date: _______________</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(contractHTML);
    printWindow.document.close();
    printWindow.print();
    
    toast({
      title: "Success",
      description: "Employment contract generated successfully"
    });
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      contractType: "Permanent",
      startDate: "",
      endDate: "",
      probationPeriod: "3",
      workingHours: "8",
      basicSalary: "",
      allowances: "",
      annualLeave: "21",
      sickLeave: "7",
      maternityLeave: "90",
      noticePeriod: "30",
      overtimeRate: "1.5",
      workLocation: "Head Office",
      reportingTo: "",
      jobDescription: "",
      benefits: "",
      termConditions: "",
      additionalTerms: ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Employment Contract</DialogTitle>
          <DialogDescription>
            Create a comprehensive employment contract for an employee
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div>
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={formData.employeeId} onValueChange={(value) => {
                const employee = employees.find(emp => emp.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  employeeId: value,
                  basicSalary: employee?.salary?.toString() || "",
                  reportingTo: employee?.department === 'HR' ? 'Managing Director' : 'Department Manager'
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractType">Contract Type</Label>
                <Select value={formData.contractType} onValueChange={(value) => setFormData(prev => ({ ...prev, contractType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                    <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                    <SelectItem value="Probation">Probation</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>

            {formData.contractType === 'Fixed Term' && (
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="probationPeriod">Probation Period (months)</Label>
                <Input
                  id="probationPeriod"
                  type="number"
                  value={formData.probationPeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, probationPeriod: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="workingHours">Working Hours/Day</Label>
                <Input
                  id="workingHours"
                  type="number"
                  value={formData.workingHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHours: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workLocation">Work Location</Label>
                <Input
                  id="workLocation"
                  value={formData.workLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, workLocation: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="reportingTo">Reporting To</Label>
                <Input
                  id="reportingTo"
                  value={formData.reportingTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportingTo: e.target.value }))}
                />
              </div>
            </div>

            <h3 className="font-semibold mt-6">Compensation</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basicSalary">Basic Salary (UGX)</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="allowances">Monthly Allowances (UGX)</Label>
                <Input
                  id="allowances"
                  type="number"
                  value={formData.allowances}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowances: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="overtimeRate">Overtime Rate Multiplier</Label>
              <Input
                id="overtimeRate"
                type="number"
                step="0.1"
                value={formData.overtimeRate}
                onChange={(e) => setFormData(prev => ({ ...prev, overtimeRate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Leave Entitlements</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="annualLeave">Annual Leave (days)</Label>
                <Input
                  id="annualLeave"
                  type="number"
                  value={formData.annualLeave}
                  onChange={(e) => setFormData(prev => ({ ...prev, annualLeave: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sickLeave">Sick Leave (days)</Label>
                <Input
                  id="sickLeave"
                  type="number"
                  value={formData.sickLeave}
                  onChange={(e) => setFormData(prev => ({ ...prev, sickLeave: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="maternityLeave">Maternity Leave (days)</Label>
                <Input
                  id="maternityLeave"
                  type="number"
                  value={formData.maternityLeave}
                  onChange={(e) => setFormData(prev => ({ ...prev, maternityLeave: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="noticePeriod">Notice Period (days)</Label>
              <Input
                id="noticePeriod"
                type="number"
                value={formData.noticePeriod}
                onChange={(e) => setFormData(prev => ({ ...prev, noticePeriod: e.target.value }))}
              />
            </div>

            <h3 className="font-semibold mt-6">Additional Details</h3>
            
            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                value={formData.jobDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
                placeholder="Detailed job responsibilities and duties..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="benefits">Additional Benefits</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
                placeholder="Medical insurance, transport allowance, etc..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="termConditions">Termination Conditions</Label>
              <Textarea
                id="termConditions"
                value={formData.termConditions}
                onChange={(e) => setFormData(prev => ({ ...prev, termConditions: e.target.value }))}
                placeholder="Special termination clauses..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="additionalTerms">Additional Terms</Label>
              <Textarea
                id="additionalTerms"
                value={formData.additionalTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalTerms: e.target.value }))}
                placeholder="Any other specific terms and conditions..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={resetForm}>
            Reset Form
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generateContract}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Contract
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractGenerator;