import { useLocation } from "react-router-dom";
import VaultButton from "@/components/vault/VaultButton";

/**
 * Shows a small "My Vault" button on every V2 workspace route,
 * since V2 pages don't use the V1 DashboardLayout header.
 * It only navigates to /vault — the wallet panel itself never renders here.
 */
const V2WalletDock = () => {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/v2")) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <VaultButton />
    </div>
  );
};

export default V2WalletDock;
