import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock } from 'lucide-react';
import { useVaultLock } from '@/hooks/useVaultLock';

/**
 * Header button. Money is never shown here — it lives behind the vault PIN.
 */
export const VaultButton = () => {
  const navigate = useNavigate();
  const { unlocked } = useVaultLock();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 px-2 sm:px-3 sm:gap-2"
      onClick={() => navigate('/vault')}
    >
      {unlocked ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4" />}
      <span className="hidden sm:inline">My Vault</span>
    </Button>
  );
};

export default VaultButton;
