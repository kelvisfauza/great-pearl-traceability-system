import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";

const V2Agreement = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Great Pearl Coffee - Service Agreement",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Agreement
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            className="print:hidden"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={printRef} className="print:p-8">
          <div className="hidden print:block mb-6">
            <StandardPrintHeader 
              title="Service Agreement" 
              includeDate={true}
            />
          </div>
          
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-base">Terms and Conditions</h3>
            
            <div className="space-y-3">
              <p>
                <strong>1. Quality Standards:</strong> All coffee deliveries are subject to quality checks, 
                uprisal adjustments, and cuttings as per company standards.
              </p>
              
              <p>
                <strong>2. Payment Terms:</strong> Payments will be processed upon successful quality 
                verification and approval through the V2 workflow system.
              </p>
              
              <p>
                <strong>3. Delivery Requirements:</strong> Suppliers must deliver coffee to designated 
                stations with proper documentation and batch tracking.
              </p>
              
              <p>
                <strong>4. Pricing:</strong> Prices are subject to daily market rates and quality 
                parameters including outturn, moisture, and foreign matter percentages.
              </p>
              
              <p>
                <strong>5. Compliance:</strong> All parties must comply with EUDR documentation 
                requirements and traceability standards.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t print:mt-16">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-8">Supplier Signature:</p>
                  <div className="border-b border-foreground/30 w-48"></div>
                  <p className="text-xs text-muted-foreground mt-1">Name & Date</p>
                </div>
                <div>
                  <p className="font-medium mb-8">Company Representative:</p>
                  <div className="border-b border-foreground/30 w-48"></div>
                  <p className="text-xs text-muted-foreground mt-1">Name & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default V2Agreement;
