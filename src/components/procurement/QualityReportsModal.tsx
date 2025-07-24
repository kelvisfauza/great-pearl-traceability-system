
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface QualityReportsModalProps {
  open: boolean;
  onClose: () => void;
}

interface QualityData {
  averagePrice: number;
  averageGroup1: number;
  averageGroup2: number;
  averagePods: number;
  averageStones: number;
  averageHusks: number;
  totalRecords: number;
}

const QualityReportsModal: React.FC<QualityReportsModalProps> = ({ open, onClose }) => {
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchQualityData = async () => {
    setLoading(true);
    try {
      // Fetch quality assessments from Firebase
      const qualityQuery = query(
        collection(db, 'quality_assessments'),
        where('status', '==', 'assessed')
      );
      
      const qualitySnapshot = await getDocs(qualityQuery);
      const assessments = qualitySnapshot.docs.map(doc => doc.data());

      if (assessments.length === 0) {
        setQualityData({
          averagePrice: 0,
          averageGroup1: 0,
          averageGroup2: 0,
          averagePods: 0,
          averageStones: 0,
          averageHusks: 0,
          totalRecords: 0
        });
        return;
      }

      // Calculate averages
      const totals = assessments.reduce((acc, assessment) => {
        acc.price += Number(assessment.suggested_price) || 0;
        acc.group1 += Number(assessment.group1_defects) || 0;
        acc.group2 += Number(assessment.group2_defects) || 0;
        acc.pods += Number(assessment.pods) || 0;
        acc.stones += Number(assessment.stones) || 0;
        acc.husks += Number(assessment.husks) || 0;
        return acc;
      }, { price: 0, group1: 0, group2: 0, pods: 0, stones: 0, husks: 0 });

      const count = assessments.length;
      setQualityData({
        averagePrice: totals.price / count,
        averageGroup1: totals.group1 / count,
        averageGroup2: totals.group2 / count,
        averagePods: totals.pods / count,
        averageStones: totals.stones / count,
        averageHusks: totals.husks / count,
        totalRecords: count
      });
    } catch (error) {
      console.error('Error fetching quality data:', error);
      toast({
        title: "Error",
        description: "Failed to load quality reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQualityData();
    }
  }, [open]);

  const handlePrintReport = () => {
    if (!qualityData) return;

    const reportContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>QUALITY ASSESSMENT REPORT</h1>
          <p><strong>Great Pearl Coffee Factory</strong></p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>Coffee Stock Quality Averages</h2>
          <p><strong>Total Records Analyzed:</strong> ${qualityData.totalRecords}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Parameter</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Average Value</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Average Price</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averagePrice.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">UGX/KG</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Group 1 Defects</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averageGroup1.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Group 2 Defects</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averageGroup2.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Pods</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averagePods.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Stones</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averageStones.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">%</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px;">Husks</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${qualityData.averageHusks.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">%</td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 40px;">
          <p><strong>Report Generated By:</strong> Great Pearl Coffee Management System</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quality Assessment Report</title>
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Quality Assessment Reports</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <p>Loading quality data...</p>
          </div>
        ) : qualityData ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Coffee Stock Quality Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-green-600">
                      {qualityData.averagePrice.toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600">Avg Price (UGX/KG)</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-red-600">
                      {qualityData.averageGroup1.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Group 1 Defects</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-orange-600">
                      {qualityData.averageGroup2.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Group 2 Defects</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-yellow-600">
                      {qualityData.averagePods.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Pods</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-gray-600">
                      {qualityData.averageStones.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Stones</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-brown-600">
                      {qualityData.averageHusks.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Husks</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 text-center">
                  Based on {qualityData.totalRecords} assessed coffee records
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handlePrintReport}>Print Report</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No quality data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QualityReportsModal;
