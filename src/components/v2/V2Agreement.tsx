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
    documentTitle: "Sales Agreement",
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
              title="Sales Agreement" 
              includeDate={false}
            />
          </div>
          
          <div className="space-y-4 text-sm print:text-base">
            <h2 className="text-xl font-bold text-center uppercase">SALES AGREEMENT</h2>
            
            <p className="text-center">
              This Agreement is made on the ___ day of __________ 2025
            </p>

            <div className="space-y-2">
              <p className="font-semibold">Between</p>
              <div className="pl-4">
                <p className="font-semibold">Seller:</p>
                <p>Name: Mugisha Moses</p>
                <p>NIN: CM801121003QJJ</p>
                <p className="text-muted-foreground">(Identification attached)</p>
              </div>
              <p className="font-semibold">And</p>
              <div className="pl-4">
                <p className="font-semibold">Buyer:</p>
                <p>Name: Mughuda Happy</p>
                <p>NIN: CM71015104L3DK</p>
                <p className="text-muted-foreground">(Identification attached)</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold">1. Description of the Motorcycle / Tricycle</p>
                <p className="pl-4">The Seller hereby agrees to sell and transfer ownership of the following vehicle to the Buyer:</p>
                <p className="pl-4">Type: <strong>Tricycle</strong></p>
                <p className="pl-4">Registration Number: <strong>UGH 828U</strong></p>
              </div>

              <div>
                <p className="font-semibold">2. Purchase Price</p>
                <p className="pl-4">The total agreed selling / buying price is <strong>UGX 8,000,000</strong> (Uganda Shillings Eight Million Only).</p>
              </div>

              <div>
                <p className="font-semibold">3. Initial Deposit</p>
                <p className="pl-4">The Buyer has paid a deposit of <strong>UGX 4,500,000</strong> (Four Million Five Hundred Thousand Only) to the Seller upon signing this agreement.</p>
              </div>

              <div>
                <p className="font-semibold">4. Balance Outstanding</p>
                <p className="pl-4">The remaining balance of <strong>UGX 3,500,000</strong> (Three Million Five Hundred Thousand Only) shall be paid only after the Seller successfully hands over the original vehicle logbook/card in the Buyer's names.</p>
              </div>

              <div>
                <p className="font-semibold">5. Buyer's Possession</p>
                <p className="pl-4">The Buyer is allowed to take physical possession and use the motorcycle immediately, but legal ownership shall only be considered completed after delivery of the logbook/card.</p>
              </div>

              <div>
                <p className="font-semibold">6. Delivery of Logbook</p>
                <p className="pl-4">The Seller must provide the original vehicle logbook / card within <strong>seven (7) days</strong> from the date of signing this agreement.</p>
              </div>

              <div>
                <p className="font-semibold">7. Failure to Provide Logbook</p>
                <p className="pl-4">If the Seller fails to provide the logbook/card within the above timeframe, the Buyer has the right to demand a refund of the deposit amount already paid.</p>
                <p className="pl-4">In such a case:</p>
                <ul className="pl-8 list-disc">
                  <li>The Seller shall refund the full deposit amount of UGX 4,500,000</li>
                  <li>PLUS an additional 5% of the deposit as interest / compensation</li>
                  <li>Refund must be done within five (5) working days from the date the Buyer makes the request.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">8. Settlement & Completion</p>
                <p className="pl-4">Once the logbook/card is delivered to the Buyer:</p>
                <ul className="pl-8 list-disc">
                  <li>The Buyer shall immediately pay the remaining balance in full</li>
                  <li>Both parties shall sign a handover note confirming completion</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">9. True Information</p>
                <p className="pl-4">Both parties confirm that the information provided, including national identification details, is true and correct.</p>
              </div>

              <div>
                <p className="font-semibold">10. Dispute Resolution</p>
                <p className="pl-4">Any disputes arising out of this agreement shall first be settled amicably, and if unresolved, shall be referred to the local authorities or legal channels under Ugandan law.</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t print:mt-12">
              <p className="font-bold text-center mb-6">SIGNED AND AGREED BY</p>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="font-semibold">Seller:</p>
                  <div>
                    <p>Name: __________________________</p>
                  </div>
                  <div>
                    <p>Signature: ______________________</p>
                  </div>
                  <div>
                    <p>Date: ___________________________</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-semibold">Buyer:</p>
                  <div>
                    <p>Name: __________________________</p>
                  </div>
                  <div>
                    <p>Signature: ______________________</p>
                  </div>
                  <div>
                    <p>Date: ___________________________</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t">
                <p className="font-semibold mb-4">Witnesses:</p>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p>1. Name: _________________________</p>
                    <p>   Signature: ____________________</p>
                  </div>
                  <div className="space-y-2">
                    <p>2. Name: _________________________</p>
                    <p>   Signature: ____________________</p>
                  </div>
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
