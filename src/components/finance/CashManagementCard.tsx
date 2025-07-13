
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Receipt, Shield, AlertTriangle, Banknote, Wallet } from "lucide-react";

interface CashManagementCardProps {
  canManageFloat: boolean;
  floatAmount: string;
  setFloatAmount: (value: string) => void;
  receiptAmount: string;
  setReceiptAmount: (value: string) => void;
  receiptDescription: string;
  setReceiptDescription: (value: string) => void;
  onFloatSubmit: () => void;
  onReceiptIssue: () => void;
  stats: any;
  formatCurrency: (amount: number) => string;
}

const CashManagementCard = ({ 
  canManageFloat, 
  floatAmount, 
  setFloatAmount, 
  receiptAmount, 
  setReceiptAmount, 
  receiptDescription, 
  setReceiptDescription, 
  onFloatSubmit, 
  onReceiptIssue, 
  stats, 
  formatCurrency 
}: CashManagementCardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Float Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Daily Float Management
          </CardTitle>
          <CardDescription>
            Record daily money received as float
            {!canManageFloat && (
              <div className="flex items-center gap-2 mt-2 text-amber-600">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Restricted to Supervisors and Operations Managers</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canManageFloat ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Float Amount (UGX)</label>
                  <Input
                    placeholder="Enter float amount"
                    value={floatAmount}
                    onChange={(e) => setFloatAmount(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={onFloatSubmit} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Record Float
                </Button>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Current Float Balance</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.currentFloat)}</p>
                  </div>
                  <Wallet className="h-12 w-12 text-blue-600" />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-500 mb-6">
                Only Supervisors and Operations Managers can manage float
              </p>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Current Float Balance</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.currentFloat)}</p>
                  </div>
                  <Wallet className="h-12 w-12 text-blue-600" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Issue Receipts
          </CardTitle>
          <CardDescription>Generate receipts for transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (UGX)</label>
              <Input
                placeholder="Enter receipt amount"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <Input
                placeholder="Enter receipt description"
                value={receiptDescription}
                onChange={(e) => setReceiptDescription(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={onReceiptIssue} className="w-full">
              <Receipt className="h-4 w-4 mr-2" />
              Issue Receipt
            </Button>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Receipts Today</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalReceipts)}</p>
              </div>
              <Receipt className="h-12 w-12 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashManagementCard;
