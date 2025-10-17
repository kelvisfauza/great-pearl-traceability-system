import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Shield, Edit, Trash2, FileCheck, Printer, Download } from 'lucide-react';

interface RolePromotionModalProps {
  open: boolean;
  userName: string;
  newRole: string;
  onClose: () => void;
}

const getRoleCapabilities = (role: string) => {
  switch (role) {
    case 'Super Admin':
      return {
        color: 'bg-red-500',
        icon: <Shield className="h-8 w-8 text-red-500" />,
        capabilities: [
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Full system access' },
          { icon: <Shield className="h-4 w-4" />, text: 'Manage all permissions and roles' },
          { icon: <Edit className="h-4 w-4" />, text: 'Create, edit, and delete all records' },
          { icon: <FileCheck className="h-4 w-4" />, text: 'Approve all requests' },
          { icon: <Printer className="h-4 w-4" />, text: 'Print and export all reports' },
        ]
      };
    case 'Manager':
      return {
        color: 'bg-orange-500',
        icon: <Shield className="h-8 w-8 text-orange-500" />,
        capabilities: [
          { icon: <FileCheck className="h-4 w-4" />, text: 'Approve requests and payments' },
          { icon: <Printer className="h-4 w-4" />, text: 'Print and export reports' },
          { icon: <Edit className="h-4 w-4" />, text: 'Edit all records' },
          { icon: <Trash2 className="h-4 w-4" />, text: 'Delete records' },
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'View all departments' },
        ]
      };
    case 'Administrator':
      return {
        color: 'bg-yellow-500',
        icon: <FileCheck className="h-8 w-8 text-yellow-500" />,
        capabilities: [
          { icon: <FileCheck className="h-4 w-4" />, text: 'Approve requests and payments' },
          { icon: <Printer className="h-4 w-4" />, text: 'Print reports and documents' },
          { icon: <Download className="h-4 w-4" />, text: 'Export data' },
          { icon: <Edit className="h-4 w-4" />, text: 'Edit existing records' },
        ]
      };
    case 'Supervisor':
      return {
        color: 'bg-green-500',
        icon: <Edit className="h-8 w-8 text-green-500" />,
        capabilities: [
          { icon: <Edit className="h-4 w-4" />, text: 'Edit records in your department' },
          { icon: <Download className="h-4 w-4" />, text: 'Export data' },
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Manage daily operations' },
        ]
      };
    case 'User':
      return {
        color: 'bg-blue-500',
        icon: <CheckCircle2 className="h-8 w-8 text-blue-500" />,
        capabilities: [
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'View records in your department' },
          { icon: <Edit className="h-4 w-4" />, text: 'Create new records (data entry)' },
        ]
      };
    default:
      return {
        color: 'bg-gray-500',
        icon: <CheckCircle2 className="h-8 w-8 text-gray-500" />,
        capabilities: [
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Basic system access' },
        ]
      };
  }
};

const RolePromotionModal = ({ open, userName, newRole, onClose }: RolePromotionModalProps) => {
  const roleInfo = getRoleCapabilities(newRole);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`rounded-full ${roleInfo.color} p-4 animate-pulse`}>
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Congratulations, {userName}!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You have been promoted to
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <Badge className={`${roleInfo.color} text-white text-lg px-6 py-2`}>
            {newRole}
          </Badge>
        </div>

        <div className="space-y-3 py-4">
          <p className="text-sm font-medium text-center mb-3">Your new capabilities:</p>
          {roleInfo.capabilities.map((capability, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-primary mt-0.5">
                {capability.icon}
              </div>
              <p className="text-sm flex-1">{capability.text}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button 
            onClick={onClose} 
            size="lg"
            className="w-full sm:w-auto px-8"
          >
            Okay, Let's Go! 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RolePromotionModal;
