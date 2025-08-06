import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEUDRDocumentation } from '@/hooks/useEUDRDocumentation';

const EUDRSummaryCard = () => {
  const {
    getTotalAvailableKilograms,
    getTotalDocumentedKilograms,
    getDocumentsByStatus,
    loading
  } = useEUDRDocumentation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            EUDR Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDocumented = getTotalDocumentedKilograms();
  const totalAvailable = getTotalAvailableKilograms();
  const documentedCount = getDocumentsByStatus('documented').length;
  const partiallySoldCount = getDocumentsByStatus('partially_sold').length;
  const soldOutCount = getDocumentsByStatus('sold_out').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          EUDR Documentation
        </CardTitle>
        <CardDescription>
          EU Deforestation Regulation compliance tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-primary">
              {totalAvailable.toLocaleString()}kg
            </div>
            <p className="text-xs text-muted-foreground">Available Stock</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {totalDocumented.toLocaleString()}kg
            </div>
            <p className="text-xs text-muted-foreground">Total Documented</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Documentation Status</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {documentedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {documentedCount} Documented
              </Badge>
            )}
            {partiallySoldCount > 0 && (
              <Badge variant="default" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {partiallySoldCount} Partial
              </Badge>
            )}
            {soldOutCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {soldOutCount} Sold Out
              </Badge>
            )}
            {documentedCount === 0 && partiallySoldCount === 0 && soldOutCount === 0 && (
              <Badge variant="secondary" className="text-xs">
                No Documentation
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EUDRSummaryCard;