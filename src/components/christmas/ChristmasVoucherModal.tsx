import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Printer, Star, Trophy, Sparkles } from 'lucide-react';
import { getStandardPrintStyles } from '@/utils/printStyles';

interface ChristmasVoucher {
  id: string;
  employee_name: string;
  voucher_amount: number;
  performance_rank: number;
  performance_score: number;
  christmas_message: string;
  claimed_at: string | null;
  voucher_code: string;
  year: number;
}

interface ChristmasVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: ChristmasVoucher | null;
  onClaim: () => void;
  claiming: boolean;
}

const ChristmasVoucherModal: React.FC<ChristmasVoucherModalProps> = ({
  open,
  onOpenChange,
  voucher,
  onClaim,
  claiming
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!voucher) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Christmas Voucher - ${voucher.voucher_code}</title>
        <style>
          ${getStandardPrintStyles()}
          
          body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #1a472a 0%, #2d5a3f 50%, #1a472a 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          
          .voucher-container {
            max-width: 700px;
            margin: 0 auto;
            background: linear-gradient(145deg, #fff9e6 0%, #fff 50%, #fff9e6 100%);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 8px solid #c41e3a;
            position: relative;
            overflow: hidden;
          }
          
          .voucher-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 15px;
            background: repeating-linear-gradient(
              90deg,
              #c41e3a 0px,
              #c41e3a 20px,
              #2d5a3f 20px,
              #2d5a3f 40px
            );
          }
          
          .voucher-container::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 15px;
            background: repeating-linear-gradient(
              90deg,
              #2d5a3f 0px,
              #2d5a3f 20px,
              #c41e3a 20px,
              #c41e3a 40px
            );
          }
          
          .corner-decoration {
            position: absolute;
            font-size: 50px;
          }
          .corner-tl { top: 25px; left: 25px; }
          .corner-tr { top: 25px; right: 25px; }
          .corner-bl { bottom: 25px; left: 25px; }
          .corner-br { bottom: 25px; right: 25px; }
          
          .company-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px dashed #c41e3a;
          }
          
          .company-logo {
            height: 70px;
            margin-bottom: 10px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1a472a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 3px;
          }
          
          .company-details {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
          }
          
          .voucher-title {
            text-align: center;
            font-size: 36px;
            color: #c41e3a;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            font-weight: bold;
          }
          
          .voucher-subtitle {
            text-align: center;
            font-size: 18px;
            color: #2d5a3f;
            margin-bottom: 30px;
          }
          
          .recipient-section {
            background: linear-gradient(135deg, #fff 0%, #f8f8f8 100%);
            border: 2px solid #2d5a3f;
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
            text-align: center;
          }
          
          .recipient-name {
            font-size: 28px;
            font-weight: bold;
            color: #1a472a;
            margin-bottom: 15px;
          }
          
          .amount-box {
            background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            display: inline-block;
            margin: 15px 0;
            box-shadow: 0 5px 20px rgba(196, 30, 58, 0.4);
          }
          
          .amount-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.9;
          }
          
          .amount-value {
            font-size: 42px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .ranking-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
            color: #333;
            padding: 10px 25px;
            border-radius: 25px;
            font-weight: bold;
            margin-top: 15px;
            box-shadow: 0 3px 10px rgba(255, 215, 0, 0.4);
          }
          
          .message-section {
            background: #f9f9f9;
            border-left: 5px solid #2d5a3f;
            padding: 20px;
            margin: 25px 0;
            font-style: italic;
            font-size: 16px;
            color: #444;
            border-radius: 0 10px 10px 0;
          }
          
          .voucher-code {
            text-align: center;
            margin: 25px 0;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 10px;
          }
          
          .code-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          
          .code-value {
            font-size: 24px;
            font-weight: bold;
            color: #c41e3a;
            letter-spacing: 4px;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px dashed #c41e3a;
            font-size: 12px;
            color: #666;
          }
          
          .snowflakes {
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 20px;
            letter-spacing: 15px;
            opacity: 0.3;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .voucher-container {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <span class="corner-decoration corner-tl">🎄</span>
          <span class="corner-decoration corner-tr">⭐</span>
          <span class="corner-decoration corner-bl">🎁</span>
          <span class="corner-decoration corner-br">🎅</span>
          
          <div class="snowflakes">❄️ ❄️ ❄️ ❄️ ❄️ ❄️ ❄️</div>
          
          <div class="company-header">
            <img 
              src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
              alt="Great Pearl Coffee Factory Logo" 
              class="company-logo"
            />
            <h1 class="company-name">Great Pearl Coffee Factory</h1>
            <p class="company-details">
              Specialty Coffee Processing & Export<br/>
              +256781121639 / +256778536681 | www.greatpearlcoffee.com
            </p>
          </div>
          
          <h2 class="voucher-title">🎄 Christmas Voucher ${voucher.year} 🎄</h2>
          <p class="voucher-subtitle">Season's Greetings & Thank You for Your Dedication!</p>
          
          <div class="recipient-section">
            <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Presented to</p>
            <p class="recipient-name">${voucher.employee_name}</p>
            
            <div class="amount-box">
              <p class="amount-label">Voucher Value</p>
              <p class="amount-value">UGX ${voucher.voucher_amount.toLocaleString()}</p>
            </div>
            
            <div class="ranking-badge">
              🏆 Ranked #${voucher.performance_rank} in Performance
            </div>
          </div>
          
          <div class="message-section">
            <p>"${voucher.christmas_message}"</p>
          </div>
          
          <div class="voucher-code">
            <p class="code-label">Voucher Code</p>
            <p class="code-value">${voucher.voucher_code}</p>
          </div>
          
          <div class="footer">
            <p>Valid for redemption until January 31, ${voucher.year + 1}</p>
            <p style="margin-top: 10px;">🎄 Merry Christmas & Happy New Year! 🎄</p>
            <p style="margin-top: 5px; font-size: 10px;">
              Generated on ${new Date().toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏆';
  };

  if (!voucher) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-50 to-green-50 border-4 border-red-600">
          <div className="text-center py-8">
            <Gift className="h-16 w-16 mx-auto text-red-500 animate-bounce mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">🎄 Merry Christmas! 🎄</h2>
            <p className="text-gray-600">
              Christmas vouchers are being prepared! Check back soon for your special gift.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-red-50 via-white to-green-50 border-4 border-red-600 p-0 overflow-hidden">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 p-4 text-white text-center relative">
          <div className="absolute top-2 left-4 text-2xl">🎄</div>
          <div className="absolute top-2 right-4 text-2xl">⭐</div>
          <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <h2 className="text-2xl font-bold">🎁 Hooray! 🎁</h2>
          <p className="text-sm opacity-90">You've received a Christmas Gift!</p>
        </div>

        <div className="p-6 space-y-6" ref={printRef}>
          {/* Amount section */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">Your Christmas Voucher</p>
            <div className="inline-block bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl shadow-lg">
              <p className="text-sm opacity-90">Amount</p>
              <p className="text-4xl font-bold">
                UGX {voucher.voucher_amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Ranking */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 px-6 py-3 rounded-full shadow-md">
              <Trophy className="h-6 w-6" />
              <span className="font-bold text-lg">
                {getRankEmoji(voucher.performance_rank)} Ranked #{voucher.performance_rank} in Performance
              </span>
            </div>
          </div>

          {/* Christmas message */}
          <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Star className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
              <p className="text-gray-700 italic">"{voucher.christmas_message}"</p>
            </div>
          </div>

          {/* Voucher code */}
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Voucher Code</p>
            <p className="text-2xl font-mono font-bold text-red-600 tracking-wider">
              {voucher.voucher_code}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!voucher.claimed_at && (
              <Button
                onClick={onClaim}
                disabled={claiming}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Gift className="h-4 w-4 mr-2" />
                {claiming ? 'Claiming...' : 'Claim Voucher'}
              </Button>
            )}
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Voucher
            </Button>
          </div>

          {voucher.claimed_at && (
            <p className="text-center text-sm text-green-600 font-medium">
              ✅ Claimed on {new Date(voucher.claimed_at).toLocaleDateString('en-GB')}
            </p>
          )}
        </div>

        {/* Footer decoration */}
        <div className="bg-gradient-to-r from-green-600 via-green-500 to-red-600 h-3" />
      </DialogContent>
    </Dialog>
  );
};

export default ChristmasVoucherModal;
