import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer } from 'lucide-react';
import { buildPublicUrl } from '@/utils/publicUrl';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  employee_id?: string;
}

interface EmployeeQRCodesProps {
  employees: Employee[];
}

const getQRUrl = (employeeId: string, size = 200) => {
  const profileUrl = buildPublicUrl(`/employee/${employeeId}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(profileUrl)}&format=svg`;
};

const EmployeeQRCard: React.FC<{ employee: Employee }> = ({ employee }) => {
  const qrUrl = getQRUrl(employee.id);

  const handleDownload = async () => {
    try {
      const response = await fetch(getQRUrl(employee.id, 400));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${employee.name.replace(/\s+/g, '-')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <div className="bg-white p-3 rounded-lg border shadow-sm">
          <img
            src={qrUrl}
            alt={`QR Code for ${employee.name}`}
            className="w-[150px] h-[150px]"
          />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.position}</p>
          <p className="text-xs text-muted-foreground">{employee.department}</p>
          {employee.employee_id && (
            <p className="text-xs font-mono text-muted-foreground mt-1">ID: {employee.employee_id}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload} className="w-full">
          <Download className="w-3 h-3 mr-1" /> Download QR
        </Button>
      </CardContent>
    </Card>
  );
};

const EmployeeQRCodes: React.FC<EmployeeQRCodesProps> = ({ employees }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrCards = employees.map(emp => `
      <div style="display:inline-block;width:200px;padding:16px;text-align:center;border:1px solid #ddd;margin:8px;border-radius:8px;page-break-inside:avoid;">
        <img src="${getQRUrl(emp.id, 180)}" style="width:180px;height:180px;" />
        <p style="font-weight:bold;margin:8px 0 2px;font-size:13px;">${emp.name}</p>
        <p style="font-size:11px;color:#666;">${emp.position}</p>
        <p style="font-size:11px;color:#666;">${emp.department}</p>
        ${emp.employee_id ? `<p style="font-size:10px;color:#999;font-family:monospace;">ID: ${emp.employee_id}</p>` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <html><head><title>Employee QR Codes - Great Pearl</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;}
      @media print{body{padding:0;} .no-print{display:none;}}</style>
      </head><body>
      <h2 class="no-print" style="margin-bottom:16px;">Employee QR Codes</h2>
      <div style="display:flex;flex-wrap:wrap;gap:0;">${qrCards}</div>
      <script>setTimeout(()=>window.print(),1000)</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Employee QR Codes</h3>
          <span className="text-sm text-muted-foreground">({employees.length} employees)</span>
        </div>
        <Button onClick={handlePrintAll} variant="outline">
          <Printer className="w-4 h-4 mr-2" /> Print All QR Codes
        </Button>
      </div>
      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {employees.map(emp => (
          <EmployeeQRCard key={emp.id} employee={emp} />
        ))}
      </div>
    </div>
  );
};

export default EmployeeQRCodes;
