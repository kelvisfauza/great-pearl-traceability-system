import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useChristmasVoucher, ChristmasVoucher } from '@/hooks/useChristmasVoucher';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Gift, CheckCircle, Clock, Search, Phone, User, Trophy, Loader2 } from 'lucide-react';

const ChristmasVoucherManager: React.FC = () => {
  const { allVouchers, completeVoucher, fetchAllVouchers } = useChristmasVoucher();
  const { employee } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');

  const pendingVouchers = allVouchers.filter(v => v.status === 'pending');
  const claimedVouchers = allVouchers.filter(v => v.status === 'claimed');
  const completedVouchers = allVouchers.filter(v => v.status === 'completed');

  const filteredClaimedVouchers = claimedVouchers.filter(v => 
    v.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.voucher_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingVouchers = pendingVouchers.filter(v => 
    v.employee_name.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
    v.voucher_code.toLowerCase().includes(pendingSearchTerm.toLowerCase())
  );

  const handleComplete = async (voucher: ChristmasVoucher) => {
    if (!employee?.email) return;
    
    setCompletingId(voucher.id);
    try {
      const success = await completeVoucher(voucher.id, employee.email);
      
      if (success) {
        toast({
          title: "Voucher Completed! 🎄",
          description: `${voucher.employee_name}'s Christmas voucher has been marked as paid. SMS sent to notify them.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to complete the voucher. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'claimed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Gift className="h-3 w-3 mr-1" />Claimed</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏆';
  };

  const getTotalAmount = (vouchers: ChristmasVoucher[]) => {
    return vouchers.reduce((sum, v) => sum + v.voucher_amount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{pendingVouchers.length}</p>
                <p className="text-xs text-yellow-600">UGX {getTotalAmount(pendingVouchers).toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Claimed (Awaiting Payment)</p>
                <p className="text-2xl font-bold text-blue-800">{claimedVouchers.length}</p>
                <p className="text-xs text-blue-600">UGX {getTotalAmount(claimedVouchers).toLocaleString()}</p>
              </div>
              <Gift className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-800">{completedVouchers.length}</p>
                <p className="text-xs text-green-600">UGX {getTotalAmount(completedVouchers).toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-green-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Total Vouchers</p>
                <p className="text-2xl font-bold text-red-800">{allVouchers.length}</p>
                <p className="text-xs text-green-600">UGX {getTotalAmount(allVouchers).toLocaleString()}</p>
              </div>
              <span className="text-3xl">🎄</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Vouchers - Not Yet Claimed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Vouchers - Not Yet Claimed
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or voucher code (e.g. XMAS-C7D46C0F)..."
              value={pendingSearchTerm}
              onChange={(e) => setPendingSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPendingVouchers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {pendingVouchers.length === 0 
                ? "No pending vouchers"
                : "No vouchers match your search"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPendingVouchers.map((voucher) => (
                <div 
                  key={voucher.id} 
                  className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getRankEmoji(voucher.performance_rank)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{voucher.employee_name}</span>
                        {getStatusBadge(voucher.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Code: <span className="font-mono font-bold text-red-600">{voucher.voucher_code}</span>
                        {' • '}Rank: #{voucher.performance_rank}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-700">
                        UGX {voucher.voucher_amount.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleComplete(voucher)}
                      disabled={completingId === voucher.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {completingId === voucher.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Mark Paid & Send SMS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claimed Vouchers - Awaiting Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-600" />
            Claimed Vouchers - Awaiting Payment
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or voucher code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredClaimedVouchers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {claimedVouchers.length === 0 
                ? "No claimed vouchers awaiting payment"
                : "No vouchers match your search"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredClaimedVouchers.map((voucher) => (
                <div 
                  key={voucher.id} 
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getRankEmoji(voucher.performance_rank)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{voucher.employee_name}</span>
                        {getStatusBadge(voucher.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Code: <span className="font-mono font-bold text-red-600">{voucher.voucher_code}</span>
                        {' • '}Rank: #{voucher.performance_rank}
                      </p>
                      {voucher.claimed_at && (
                        <p className="text-xs text-muted-foreground">
                          Claimed: {new Date(voucher.claimed_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-700">
                        UGX {voucher.voucher_amount.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleComplete(voucher)}
                      disabled={completingId === voucher.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {completingId === voucher.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Mark Paid & Send SMS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Vouchers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Completed Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedVouchers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No completed vouchers yet
            </p>
          ) : (
            <div className="space-y-2">
              {completedVouchers.slice(0, 10).map((voucher) => (
                <div 
                  key={voucher.id} 
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{getRankEmoji(voucher.performance_rank)}</div>
                    <div>
                      <span className="font-medium">{voucher.employee_name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({voucher.voucher_code})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-700">
                      UGX {voucher.voucher_amount.toLocaleString()}
                    </span>
                    {getStatusBadge(voucher.status)}
                  </div>
                </div>
              ))}
              {completedVouchers.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  + {completedVouchers.length - 10} more completed vouchers
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChristmasVoucherManager;
