import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOvertimeAwards } from '@/hooks/useOvertimeAwards';
import { Search, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export const OvertimeClaimsManager = () => {
  const [searchRef, setSearchRef] = useState('');
  const { awards, completeOvertimeClaim, searchByReference, loading } = useOvertimeAwards();
  const [searchResult, setSearchResult] = useState<any>(null);

  console.log('🔄 OvertimeClaimsManager rendered');
  console.log('🔄 Total awards:', awards?.length);
  console.log('🔄 Awards data:', awards);
  console.log('🔄 Loading state:', loading);

  const pendingAwards = awards.filter(award => award.status === 'pending');
  const claimedAwards = awards.filter(award => award.status === 'claimed');
  const completedAwards = awards.filter(award => award.status === 'completed');

  console.log('📋 Pending awards (unclaimed):', pendingAwards.length, pendingAwards);
  console.log('📋 Claimed awards (waiting for completion):', claimedAwards.length, claimedAwards);
  console.log('📋 Completed awards:', completedAwards.length, completedAwards);

  const handleSearch = async () => {
    if (!searchRef.trim()) return;
    const result = await searchByReference(searchRef);
    setSearchResult(result);
  };

  const handleComplete = async (awardId: string) => {
    await completeOvertimeClaim(awardId);
    setSearchResult(null);
    setSearchRef('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100">Pending</Badge>;
      case 'claimed':
        return <Badge variant="outline" className="bg-blue-100">Claimed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search by Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Claim by Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter reference number (e.g., OT-1234567890-ABCD)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {searchResult && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{searchResult.employee_name}</h3>
                {getStatusBadge(searchResult.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-medium">{searchResult.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Overtime:</span>
                  <p className="font-medium">{searchResult.hours}h {searchResult.minutes}m</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium text-green-600">
                    {searchResult.total_amount.toLocaleString()} UGX
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reference:</span>
                  <p className="font-mono text-xs">{searchResult.reference_number}</p>
                </div>
              </div>

              {searchResult.status === 'claimed' && (
                <Button 
                  onClick={() => handleComplete(searchResult.id)}
                  className="w-full"
                >
                  Mark as Completed
                </Button>
              )}

              {searchResult.status === 'completed' && (
                <div className="text-center text-sm text-green-600">
                  ✓ This claim has been completed
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claimed Awards - Pending Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Claims - Awaiting Payment ({claimedAwards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading claims...</p>
          ) : claimedAwards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending claims</p>
          ) : (
            <div className="space-y-3">
              {claimedAwards.map((award) => (
                <div key={award.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{award.employee_name}</h4>
                      <p className="text-sm text-muted-foreground">{award.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {award.total_amount.toLocaleString()} UGX
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {award.hours}h {award.minutes}m
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>Reference: <span className="font-mono">{award.reference_number}</span></p>
                    <p>Claimed: {award.claimed_at ? format(new Date(award.claimed_at), 'PPp') : 'N/A'}</p>
                  </div>

                  <Button 
                    onClick={() => handleComplete(award.id)}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Claims History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Completed Claims ({completedAwards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading history...</p>
          ) : completedAwards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed claims yet</p>
          ) : (
            <div className="space-y-2">
              {completedAwards.slice(0, 10).map((award) => (
                <div key={award.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{award.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {award.reference_number} • Completed by {award.completed_by}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{award.total_amount.toLocaleString()} UGX</p>
                    <p className="text-xs text-muted-foreground">
                      {award.completed_at ? format(new Date(award.completed_at), 'PP') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
