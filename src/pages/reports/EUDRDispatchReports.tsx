import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck } from 'lucide-react';
import EUDRDispatchReportsList from '@/components/store/EUDRDispatchReportsList';
import { useEUDRDispatchReports } from '@/hooks/useEUDRDispatchReports';
import { useAuth } from '@/contexts/AuthContext';

const EUDRDispatchReportsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { reports, loading, fetchReports } = useEUDRDispatchReports();

  // Only admins/managers can view all reports
  const canViewAll = hasPermission('Administrator') || hasPermission('Managing Director');

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading dispatch reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-6 w-6" />
                EUDR Dispatch Comparison Reports
              </h1>
              <p className="text-muted-foreground">
                View all dispatch and buyer weighing comparison reports
              </p>
            </div>
          </div>
        </div>

        <EUDRDispatchReportsList reports={reports} showAll={true} onRefresh={fetchReports} />
      </div>
    </div>
  );
};

export default EUDRDispatchReportsPage;
