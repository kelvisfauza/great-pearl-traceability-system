import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, FlaskConical, Warehouse, Factory,
  FileSignature, Truck, Ship, Banknote, ShieldCheck, Settings2, ArrowLeft, Menu, Receipt, Users,
} from 'lucide-react';
import { useV3Roles, V3Role, V3_ROLE_LABELS } from '@/hooks/useV3Roles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { COMPANY_TAGLINE } from '@/utils/companyBrand';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: V3Role[];
}

export const V3_NAV: NavItem[] = [
  { to: '/v3', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/v3/receiving', label: 'Receiving', icon: PackagePlus, roles: ['storekeeper', 'store_manager', 'branch_manager'] },
  { to: '/v3/suppliers', label: 'Suppliers & Coffee', icon: Users, roles: ['storekeeper', 'store_manager', 'branch_manager', 'trade_manager', 'quality_manager', 'procurement_it', 'finance_manager'] },
  { to: '/v3/quality', label: 'Quality Lab', icon: FlaskConical, roles: ['quality_officer', 'quality_manager'] },
  { to: '/v3/store', label: 'Store & Stock', icon: Warehouse, roles: ['storekeeper', 'store_manager', 'branch_manager'] },
  { to: '/v3/grns', label: 'GRNs', icon: Receipt, roles: ['store_manager', 'branch_manager', 'quality_manager', 'finance_officer', 'finance_manager'] },
  { to: '/v3/production', label: 'Production', icon: Factory, roles: ['production_manager', 'production_operator'] },
  { to: '/v3/trade', label: 'Trade & Contracts', icon: FileSignature, roles: ['trade_manager'] },
  { to: '/v3/logistics', label: 'Transport', icon: Truck, roles: ['logistics_manager', 'driver', 'store_manager'] },
  { to: '/v3/export', label: 'Export', icon: Ship, roles: ['export_manager', 'export_officer', 'compliance_officer'] },
  { to: '/v3/finance', label: 'Finance', icon: Banknote, roles: ['finance_manager', 'finance_officer'] },
  { to: '/v3/compliance', label: 'EUDR & Audit', icon: ShieldCheck, roles: ['compliance_officer'] },
  { to: '/v3/admin', label: 'Administration', icon: Settings2, roles: [] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { hasRole, isV3Admin } = useV3Roles();
  const visible = V3_NAV.filter((i) => !i.roles || (i.roles.length === 0 ? isV3Admin : hasRole(...i.roles)));

  return (
    <nav className="space-y-1">
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/v3'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function V3Layout({ title, description, actions, children }: Props) {
  const navigate = useNavigate();
  const { roles } = useV3Roles();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-card min-h-screen sticky top-0">
          <div className="p-4 border-b">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">V3 Export Site</p>
            <h2 className="font-semibold leading-tight">YEDA Coffee ERP</h2>
            <p className="text-[11px] text-muted-foreground mt-1">{COMPANY_TAGLINE}</p>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            <NavLinks />
          </div>
          <div className="p-3 border-t space-y-2">
            <div className="flex flex-wrap gap-1">
              {roles.slice(0, 3).map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">{V3_ROLE_LABELS[r]}</Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to main system
            </Button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-3 px-4 py-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">V3 Export Site</p>
                  <NavLinks />
                </SheetContent>
              </Sheet>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">{title}</h1>
                {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
              </div>
              {actions}
            </div>
          </header>
          <main className="p-4 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}