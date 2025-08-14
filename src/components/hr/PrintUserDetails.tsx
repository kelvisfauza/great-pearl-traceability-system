import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@/hooks/useSupabaseEmployees";

interface PrintUserDetailsProps {
  employees: Employee[];
}

export default function PrintUserDetails({ employees }: PrintUserDetailsProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { toast } = useToast();

  const handlePrintUserDetails = () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    if (!employee) {
      toast({
        title: "Error",
        description: "Employee not found",
        variant: "destructive"
      });
      return;
    }

    // Create printable content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee Details - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .document-title { font-size: 18px; margin-top: 10px; }
            .employee-details { background: #f8f9fa; padding: 20px; border-radius: 8px; }
            .detail-row { margin: 10px 0; display: flex; }
            .detail-label { font-weight: bold; width: 150px; }
            .detail-value { flex: 1; }
            .divider { border-top: 2px solid #dee2e6; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Great Pearl Coffee Management System</div>
            <div class="document-title">Employee Details Report</div>
            <div>Generated on: ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="employee-details">
            <div class="detail-row">
              <div class="detail-label">Employee ID:</div>
              <div class="detail-value">${employee.id}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Full Name:</div>
              <div class="detail-value">${employee.name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Email:</div>
              <div class="detail-value">${employee.email}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Phone:</div>
              <div class="detail-value">${employee.phone || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Position:</div>
              <div class="detail-value">${employee.position}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Department:</div>
              <div class="detail-value">${employee.department}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Role:</div>
              <div class="detail-value">${employee.role}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">${employee.status}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Salary:</div>
              <div class="detail-value">UGX ${employee.salary?.toLocaleString() || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Created At:</div>
              <div class="detail-value">${employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <p>This document is confidential and intended for authorized personnel only.</p>
            <p>Great Pearl Coffee Management System - Employee Information</p>
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();

      toast({
        title: "Print Success",
        description: `Employee details for ${employee.name} sent to printer`,
      });
    } else {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Print Employee Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="employeeSelect">Select Employee</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an employee to print details" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name} - {employee.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handlePrintUserDetails} 
          disabled={!selectedEmployeeId}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          Print Employee Details
        </Button>
      </CardContent>
    </Card>
  );
}