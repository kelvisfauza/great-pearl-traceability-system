import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import VaultGate from '@/components/vault/VaultGate';
import { AccountButton as WalletPanel } from '@/components/AccountButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVaultLock } from '@/hooks/useVaultLock';
import { Landmark, HandCoins, CreditCard, Lock, ShieldCheck } from 'lucide-react';

const SHORTCUTS = [
  { label: 'Loans', description: 'Request, track and repay your loans', icon: Landmark, to: '/quick-loans' },
  { label: 'Salary advances', description: 'Request an advance and see recoveries', icon: HandCoins, to: '/quick-loans' },
  { label: 'Overdraft', description: 'Apply for or draw on your overdraft', icon: CreditCard, to: '/overdraft' },
];

const VaultInner = () => {
  const navigate = useNavigate();
  const { lock } = useVaultLock();

  return (
    <div className="space-y-6">
      <div className="card-modern p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your money vault is open</h2>
            <p className="text-sm text-muted-foreground">It closes on its own after 5 minutes without activity.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={lock}>
          <Lock className="h-4 w-4 mr-2" /> Close vault
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SHORTCUTS.map(s => (
          <Card key={s.label} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(s.to)}>
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="card-modern p-5">
        <WalletPanel />
      </div>
    </div>
  );
};

const Vault = () => (
  <DashboardLayout title="My Vault" subtitle="Wallet, loans, advances and savings — all in one protected place">
    <VaultGate>
      <VaultInner />
    </VaultGate>
  </DashboardLayout>
);

export default Vault;
