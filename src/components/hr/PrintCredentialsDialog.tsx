
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrintCredentialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

const PrintCredentialsDialog = ({ isOpen, onClose, employee }: PrintCredentialsDialogProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the employee's password to print credentials",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your browser's popup settings.",
        variant: "destructive"
      });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Login Credentials - Great Pearl Coffee Company</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
              background: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #2c3e50; 
              margin: 0;
              font-size: 28px;
            }
            .header h2 { 
              color: #34495e; 
              margin: 10px 0 0 0;
              font-size: 18px;
              font-weight: normal;
            }
            .credentials { 
              border: 2px solid #2c3e50; 
              padding: 25px; 
              margin: 20px 0; 
              background: #f8f9fa;
              border-radius: 5px;
            }
            .field { 
              margin: 12px 0; 
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .field:last-child {
              border-bottom: none;
            }
            .label { 
              font-weight: bold; 
              color: #2c3e50;
              display: inline-block;
              width: 150px;
            }
            .value {
              color: #34495e;
            }
            .password-field {
              background: #fff3cd;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid #ffeaa7;
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 12px; 
              color: #7f8c8d;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            .important {
              background: #e74c3c;
              color: white;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Great Pearl Coffee Company</h1>
              <h2>Employee Login Credentials</h2>
            </div>
            
            <div class="credentials">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${employee.name}</span>
              </div>
              <div class="field">
                <span class="label">Email/Username:</span>
                <span class="value">${employee.email}</span>
              </div>
              <div class="field password-field">
                <span class="label">Password:</span>
                <span class="value" style="font-family: monospace; font-size: 16px; font-weight: bold;">${password}</span>
              </div>
              <div class="field">
                <span class="label">Department:</span>
                <span class="value">${employee.department}</span>
              </div>
              <div class="field">
                <span class="label">Role:</span>
                <span class="value">${employee.role}</span>
              </div>
              <div class="field">
                <span class="label">Employee ID:</span>
                <span class="value">${employee.employee_id || 'N/A'}</span>
              </div>
              <div class="field">
                <span class="label">Print Date:</span>
                <span class="value">${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div class="important">
              IMPORTANT: Keep these credentials secure and confidential.
            </div>
            
            <div class="footer">
              <p><strong>Security Notice:</strong> This document contains sensitive login information.</p>
              <p>Please keep this document secure and handle according to company security policies.</p>
              <p>For technical support, contact the IT department.</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    
    toast({
      title: "Credentials Printed",
      description: `Login credentials for ${employee.name} have been sent to printer`
    });
    
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print Login Credentials</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm space-y-2">
              <div><strong>Employee:</strong> {employee?.name}</div>
              <div><strong>Email:</strong> {employee?.email}</div>
              <div><strong>Department:</strong> {employee?.department}</div>
              <div><strong>Role:</strong> {employee?.role}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Enter Employee Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to print credentials"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Credentials
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          
          <div className="text-xs text-gray-600 text-center">
            <p><strong>Note:</strong> This will print a document with the employee's login credentials.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintCredentialsDialog;
