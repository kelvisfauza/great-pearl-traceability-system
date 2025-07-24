
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, CheckCircle } from 'lucide-react';

interface QualityReportsModalProps {
  open: boolean;
  onClose: () => void;
}

interface QualityMetrics {
  averagePrice: number;
  averageGroup1Defects: number;
  averageGroup2Defects: number;
  averagePods: number;
  averageStones: number;
  averageHusks: number;
  averageMoisture: number;
  averageBelow12: number;
  totalBatches: number;
  totalKilograms: number;
}

interface CoffeeTypeMetrics {
  coffeeType: string;
  averagePrice: number;
  totalKilograms: number;
  batchCount: number;
  qualityScore: number;
}

const QualityReportsModal: React.FC<QualityReportsModalProps> = ({ open, onClose }) => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [coffeeTypeMetrics, setCoffeeTypeMetrics] = useState<CoffeeTypeMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchQualityMetrics();
    }
  }, [open]);

  const fetchQualityMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch quality assessments with store records
      const { data: assessments, error: assessmentsError } = await supabase
        .from('quality_assessments')
        .select(`
          *,
          store_record:coffee_records(coffee_type, kilograms)
        `);

      if (assessmentsError) {
        console.error('Error fetching quality assessments:', assessmentsError);
        return;
      }

      if (!assessments || assessments.length === 0) {
        setMetrics({
          averagePrice: 0,
          averageGroup1Defects: 0,
          averageGroup2Defects: 0,
          averagePods: 0,
          averageStones: 0,
          averageHusks: 0,
          averageMoisture: 0,
          averageBelow12: 0,
          totalBatches: 0,
          totalKilograms: 0
        });
        setCoffeeTypeMetrics([]);
        return;
      }

      // Calculate overall metrics
      const totalBatches = assessments.length;
      const totalKilograms = assessments.reduce((sum, assessment) => {
        const storeRecord = assessment.store_record as any;
        return sum + (storeRecord?.kilograms || 0);
      }, 0);

      const averagePrice = assessments.reduce((sum, assessment) => sum + (assessment.suggested_price || 0), 0) / totalBatches;
      const averageGroup1Defects = assessments.reduce((sum, assessment) => sum + (assessment.group1_defects || 0), 0) / totalBatches;
      const averageGroup2Defects = assessments.reduce((sum, assessment) => sum + (assessment.group2_defects || 0), 0) / totalBatches;
      const averagePods = assessments.reduce((sum, assessment) => sum + (assessment.pods || 0), 0) / totalBatches;
      const averageStones = assessments.reduce((sum, assessment) => sum + (assessment.stones || 0), 0) / totalBatches;
      const averageHusks = assessments.reduce((sum, assessment) => sum + (assessment.husks || 0), 0) / totalBatches;
      const averageMoisture = assessments.reduce((sum, assessment) => sum + (assessment.moisture || 0), 0) / totalBatches;
      const averageBelow12 = assessments.reduce((sum, assessment) => sum + (assessment.below12 || 0), 0) / totalBatches;

      setMetrics({
        averagePrice,
        averageGroup1Defects,
        averageGroup2Defects,
        averagePods,
        averageStones,
        averageHusks,
        averageMoisture,
        averageBelow12,
        totalBatches,
        totalKilograms
      });

      // Group by coffee type
      const coffeeTypeGroups = assessments.reduce((groups, assessment) => {
        const storeRecord = assessment.store_record as any;
        const coffeeType = storeRecord?.coffee_type || 'Unknown';
        
        if (!groups[coffeeType]) {
          groups[coffeeType] = [];
        }
        groups[coffeeType].push(assessment);
        return groups;
      }, {} as Record<string, any[]>);

      // Calculate metrics per coffee type
      const coffeeTypeMetricsData = Object.entries(coffeeTypeGroups).map(([coffeeType, typeAssessments]) => {
        const batchCount = typeAssessments.length;
        const averagePrice = typeAssessments.reduce((sum, assessment) => sum + (assessment.suggested_price || 0), 0) / batchCount;
        const totalKilograms = typeAssessments.reduce((sum, assessment) => {
          const storeRecord = assessment.store_record as any;
          return sum + (storeRecord?.kilograms || 0);
        }, 0);
        
        // Calculate quality score (lower defects = higher score)
        const avgDefects = (
          typeAssessments.reduce((sum, assessment) => sum + (assessment.group1_defects || 0) + (assessment.group2_defects || 0), 0) / batchCount
        );
        const qualityScore = Math.max(0, 100 - avgDefects);

        return {
          coffeeType,
          averagePrice,
          totalKilograms,
          batchCount,
          qualityScore
        };
      });

      setCoffeeTypeMetrics(coffeeTypeMetricsData);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!metrics) return;

    const reportContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>QUALITY REPORT</h1>
          <p><strong>Great Pearl Coffee Factory</strong></p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>Overall Quality Metrics</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Total Batches Assessed:</td>
              <td style="padding: 8px;">${metrics.totalBatches}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Total Kilograms:</td>
              <td style="padding: 8px;">${metrics.totalKilograms.toLocaleString()} KG</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Price:</td>
              <td style="padding: 8px;">UGX ${metrics.averagePrice.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Moisture:</td>
              <td style="padding: 8px;">${metrics.averageMoisture.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Group 1 Defects:</td>
              <td style="padding: 8px;">${metrics.averageGroup1Defects.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Group 2 Defects:</td>
              <td style="padding: 8px;">${metrics.averageGroup2Defects.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Pods:</td>
              <td style="padding: 8px;">${metrics.averagePods.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Stones:</td>
              <td style="padding: 8px;">${metrics.averageStones.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Husks:</td>
              <td style="padding: 8px;">${metrics.averageHusks.toFixed(1)}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; font-weight: bold;">Average Below 12 Screen:</td>
              <td style="padding: 8px;">${metrics.averageBelow12.toFixed(1)}%</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>Coffee Type Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Coffee Type</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Batches</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Kilograms</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Avg Price</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Quality Score</th>
              </tr>
            </thead>
            <tbody>
              ${coffeeTypeMetrics.map(metric => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${metric.coffeeType}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${metric.batchCount}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${metric.totalKilograms.toLocaleString()} KG</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">UGX ${metric.averagePrice.toLocaleString()}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${metric.qualityScore.toFixed(1)}/100</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quality Report</title>
          </head>
          <body>
            ${reportContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quality Reports</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <p>Loading quality metrics...</p>
          </div>
        ) : !metrics ? (
          <div className="text-center py-8">
            <p>No quality data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-2xl font-bold">{metrics.totalBatches}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Kilograms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">{metrics.totalKilograms.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">UGX {metrics.averagePrice.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Moisture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                    <span className="text-2xl font-bold">{metrics.averageMoisture.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Defect Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Defect Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Group 1 Defects</p>
                    <p className="text-xl font-bold">{metrics.averageGroup1Defects.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Group 2 Defects</p>
                    <p className="text-xl font-bold">{metrics.averageGroup2Defects.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Pods</p>
                    <p className="text-xl font-bold">{metrics.averagePods.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Stones</p>
                    <p className="text-xl font-bold">{metrics.averageStones.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Husks</p>
                    <p className="text-xl font-bold">{metrics.averageHusks.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Below 12 Screen</p>
                    <p className="text-xl font-bold">{metrics.averageBelow12.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coffee Type Breakdown */}
            {coffeeTypeMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Coffee Type Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {coffeeTypeMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{metric.coffeeType}</p>
                          <p className="text-sm text-gray-600">{metric.batchCount} batches • {metric.totalKilograms.toLocaleString()} KG</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">UGX {metric.averagePrice.toLocaleString()}</p>
                          <Badge variant={metric.qualityScore > 80 ? 'default' : metric.qualityScore > 60 ? 'secondary' : 'destructive'}>
                            Quality: {metric.qualityScore.toFixed(1)}/100
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart */}
            {coffeeTypeMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Average Prices by Coffee Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={coffeeTypeMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="coffeeType" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`UGX ${Number(value).toLocaleString()}`, 'Average Price']} />
                      <Bar dataKey="averagePrice" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handlePrintReport}>
                Print Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QualityReportsModal;
