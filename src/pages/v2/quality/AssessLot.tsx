import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import V2Navigation from "@/components/v2/V2Navigation";
import QualityAssessmentForm from "@/components/v2/quality/QualityAssessmentForm";

const AssessLot = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: lot, isLoading } = useQuery({
    queryKey: ['coffee-lot', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="text-center py-8">
        Lot not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/v2/quality')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quality Assessment</h1>
            <p className="text-muted-foreground mt-2">
              Batch: {lot.batch_number}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Lot Details */}
            <Card>
              <CardHeader>
                <CardTitle>Lot Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{lot.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coffee Type</p>
                  <p className="font-medium">{lot.coffee_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms</p>
                  <p className="font-medium">{lot.kilograms} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bags</p>
                  <p className="font-medium">{lot.bags}</p>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <QualityAssessmentForm lot={lot} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessLot;
