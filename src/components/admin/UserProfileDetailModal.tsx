import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar, 
  CreditCard, MapPin, Heart, Shield, Users, IdCard 
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: string;
  position: string;
  status: string;
  avatar_url?: string;
  phone?: string;
  employee_id?: string;
  join_date?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  district?: string;
  address?: string;
  tribe?: string;
  national_id_number?: string;
  national_id_name?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
  emergency_contact?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  salary?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
};

const UserProfileDetailModal: React.FC<Props> = ({ open, onClose, employee }) => {
  if (!employee) return null;

  const initials = employee.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Administrator': 'bg-red-100 text-red-800 border-red-200',
      'Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Supervisor': 'bg-blue-100 text-blue-800 border-blue-200',
      'User': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (val?: number | null) => {
    if (val == null) return null;
    return `UGX ${val.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Employee Profile</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <Avatar className="h-20 w-20">
            <AvatarImage src={employee.avatar_url} alt={employee.name} />
            <AvatarFallback className="text-xl bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{employee.name}</h2>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className={getRoleColor(employee.role)}>{employee.role}</Badge>
              <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>{employee.status}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Work Info */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Work Information</h3>
          <InfoRow icon={Building2} label="Department" value={employee.department} />
          <InfoRow icon={Briefcase} label="Position" value={employee.position} />
          <InfoRow icon={IdCard} label="Employee ID" value={employee.employee_id} />
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={Calendar} label="Join Date" value={formatDate(employee.join_date)} />
          <InfoRow icon={CreditCard} label="Salary" value={formatCurrency(employee.salary)} />
        </div>

        <Separator />

        {/* Personal Info */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Personal Information</h3>
          <InfoRow icon={User} label="Gender" value={employee.gender} />
          <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.date_of_birth)} />
          <InfoRow icon={Heart} label="Marital Status" value={employee.marital_status} />
          <InfoRow icon={MapPin} label="District" value={employee.district} />
          <InfoRow icon={MapPin} label="Address" value={employee.address} />
          <InfoRow icon={Users} label="Tribe" value={employee.tribe} />
          <InfoRow icon={IdCard} label="National ID" value={employee.national_id_number} />
          <InfoRow icon={User} label="ID Name" value={employee.national_id_name} />
        </div>

        {/* Next of Kin */}
        {(employee.next_of_kin_name || employee.emergency_contact) && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Emergency / Next of Kin</h3>
              <InfoRow icon={Users} label="Next of Kin" value={employee.next_of_kin_name} />
              <InfoRow icon={Phone} label="Next of Kin Phone" value={employee.next_of_kin_phone} />
              <InfoRow icon={Heart} label="Relationship" value={employee.next_of_kin_relationship} />
              <InfoRow icon={Phone} label="Emergency Contact" value={employee.emergency_contact} />
            </div>
          </>
        )}

        {/* Banking */}
        {(employee.bank_name || employee.account_number) && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Banking Details</h3>
              <InfoRow icon={CreditCard} label="Bank" value={employee.bank_name} />
              <InfoRow icon={User} label="Account Name" value={employee.account_name} />
              <InfoRow icon={CreditCard} label="Account Number" value={employee.account_number} />
            </div>
          </>
        )}

        {/* Permissions */}
        <Separator />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Permissions ({employee.permissions.includes('*') ? 'All' : employee.permissions.length})</h3>
          <div className="flex flex-wrap gap-1">
            {employee.permissions.includes('*') ? (
              <Badge variant="destructive">Full Administrator Access</Badge>
            ) : (
              employee.permissions.map(p => (
                <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDetailModal;
