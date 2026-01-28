import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, X, Coffee } from 'lucide-react';
import { PriceApprovalRequest, usePriceApprovals } from '@/hooks/usePriceApprovals';
import { formatDistanceToNow } from 'date-fns';

interface PendingPriceApprovalProps {
  myPendingRequest: PriceApprovalRequest | null;
  myRejectedRequests: PriceApprovalRequest[];
  onDismissRejection: (id: string) => void;
  onUseRejectedPrices?: (request: PriceApprovalRequest) => void;
}

const PendingPriceApproval: React.FC<PendingPriceApprovalProps> = ({
  myPendingRequest,
  myRejectedRequests,
  onDismissRejection,
  onUseRejectedPrices
}) => {
  if (!myPendingRequest && myRejectedRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Pending Request */}
      {myPendingRequest && (
        <Card className={`${myPendingRequest.is_correction ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg flex items-center gap-2 ${myPendingRequest.is_correction ? 'text-orange-700' : 'text-amber-700'}`}>
              <Clock className="h-5 w-5" />
              {myPendingRequest.is_correction ? 'Correction Pending Approval' : 'Pending Approval'}
              {myPendingRequest.is_correction && (
                <Badge variant="destructive" className="bg-orange-500 ml-2">
                  CORRECTION
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Your {myPendingRequest.is_correction ? 'price correction' : 'price update'} is waiting for admin approval. Submitted{' '}
              {formatDistanceToNow(new Date(myPendingRequest.submitted_at), { addSuffix: true })}.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Coffee className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-medium">Arabica</span>
                </div>
                <p className="text-lg font-bold">
                  UGX {myPendingRequest.arabica_buying_price.toLocaleString()}/kg
                </p>
                <p className="text-xs text-muted-foreground">
                  {myPendingRequest.arabica_outturn}% outturn
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Coffee className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm font-medium">Robusta</span>
                </div>
                <p className="text-lg font-bold">
                  UGX {myPendingRequest.robusta_buying_price.toLocaleString()}/kg
                </p>
                <p className="text-xs text-muted-foreground">
                  {myPendingRequest.robusta_outturn}% outturn
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`mt-3 ${myPendingRequest.is_correction ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}
            >
              Awaiting Admin Review
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Rejected Requests */}
      {myRejectedRequests.map((request) => (
        <Card key={request.id} className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Price Update Rejected
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDismissRejection(request.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Rejected by {request.reviewed_by}{' '}
              {request.reviewed_at && formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
            </p>
            
            {/* Your submitted prices */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <div className="text-sm font-medium">Your Arabica Price</div>
                <p className="text-lg font-bold line-through text-red-600">
                  UGX {request.arabica_buying_price.toLocaleString()}/kg
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <div className="text-sm font-medium">Your Robusta Price</div>
                <p className="text-lg font-bold line-through text-red-600">
                  UGX {request.robusta_buying_price.toLocaleString()}/kg
                </p>
              </div>
            </div>

            {/* Rejection reason */}
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border mb-4">
              <div className="text-sm font-medium mb-1">Reason for Rejection</div>
              <p className="text-sm text-muted-foreground">{request.rejection_reason}</p>
            </div>

            {/* Suggested prices */}
            {(request.suggested_arabica_price || request.suggested_robusta_price) && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mb-4">
                <div className="text-sm font-medium mb-2 text-green-700">Admin's Suggested Prices</div>
                <div className="grid grid-cols-2 gap-4">
                  {request.suggested_arabica_price && (
                    <div>
                      <span className="text-sm">Arabica:</span>
                      <p className="text-lg font-bold text-green-700">
                        UGX {request.suggested_arabica_price.toLocaleString()}/kg
                      </p>
                    </div>
                  )}
                  {request.suggested_robusta_price && (
                    <div>
                      <span className="text-sm">Robusta:</span>
                      <p className="text-lg font-bold text-green-700">
                        UGX {request.suggested_robusta_price.toLocaleString()}/kg
                      </p>
                    </div>
                  )}
                </div>
                {onUseRejectedPrices && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 bg-green-100 hover:bg-green-200 border-green-300"
                    onClick={() => onUseRejectedPrices(request)}
                  >
                    Use Suggested Prices
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PendingPriceApproval;
