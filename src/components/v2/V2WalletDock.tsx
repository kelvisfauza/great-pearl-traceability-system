import { useLocation } from "react-router-dom";
import { AccountButton } from "@/components/AccountButton";

/**
 * Shows the user's wallet (AccountButton) on every V2 workspace route,
 * since V2 pages don't use the V1 DashboardLayout header.
 */
const V2WalletDock = () => {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/v2")) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <AccountButton />
    </div>
  );
};

export default V2WalletDock;
