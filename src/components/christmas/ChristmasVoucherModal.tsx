import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Printer, Star, Trophy, Sparkles, AlertCircle } from 'lucide-react';

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
          @page {
            size: A4;
            margin: 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: #1a472a;
            min-height: 100vh;
            padding: 15px;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .voucher-container {
            max-width: 100%;
            height: auto;
            background: linear-gradient(145deg, #fffef0 0%, #fff 50%, #fffef0 100%);
            border-radius: 16px;
            padding: 25px 30px;
            border: 6px solid #c41e3a;
            position: relative;
            overflow: hidden;
          }
          
          .border-pattern-top, .border-pattern-bottom {
            position: absolute;
            left: 0;
            right: 0;
            height: 12px;
            background: repeating-linear-gradient(
              90deg,
              #c41e3a 0px,
              #c41e3a 15px,
              #2d5a3f 15px,
              #2d5a3f 30px
            );
          }
          .border-pattern-top { top: 0; }
          .border-pattern-bottom { bottom: 0; }
          
          .corner-decoration {
            position: absolute;
            font-size: 32px;
          }
          .corner-tl { top: 18px; left: 18px; }
          .corner-tr { top: 18px; right: 18px; }
          .corner-bl { bottom: 18px; left: 18px; }
          .corner-br { bottom: 18px; right: 18px; }
          
          .company-header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 2px dashed #c41e3a;
          }
          
          .company-logo {
            height: 50px;
            margin-bottom: 6px;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a472a;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          
          .company-details {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }
          
          .voucher-title {
            text-align: center;
            font-size: 26px;
            color: #c41e3a;
            margin: 12px 0 6px;
            font-weight: bold;
          }
          
          .voucher-subtitle {
            text-align: center;
            font-size: 13px;
            color: #2d5a3f;
            margin-bottom: 15px;
          }
          
          .recipient-section {
            background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
            border: 2px solid #2d5a3f;
            border-radius: 12px;
            padding: 15px;
            margin: 12px 0;
            text-align: center;
          }
          
          .presented-to {
            font-size: 11px;
            color: #888;
            margin-bottom: 4px;
          }
          
          .recipient-name {
            font-size: 22px;
            font-weight: bold;
            color: #1a472a;
            margin-bottom: 12px;
          }
          
          .amount-box {
            background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            display: inline-block;
            margin: 8px 0;
          }
          
          .amount-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          }
          
          .amount-value {
            font-size: 32px;
            font-weight: bold;
          }
          
          .ranking-badge {
            display: inline-block;
            background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
            color: #333;
            padding: 6px 18px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
          }
          
          .message-section {
            background: #f5f9f5;
            border-left: 4px solid #2d5a3f;
            padding: 12px 15px;
            margin: 12px 0;
            font-style: italic;
            font-size: 13px;
            color: #444;
            border-radius: 0 8px 8px 0;
          }
          
          .voucher-code-section {
            text-align: center;
            margin: 12px 0;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 8px;
          }
          
          .code-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .code-value {
            font-size: 20px;
            font-weight: bold;
            color: #c41e3a;
            letter-spacing: 3px;
            font-family: 'Courier New', monospace;
          }
          
          .footer {
            text-align: center;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 2px dashed #c41e3a;
            font-size: 10px;
            color: #666;
          }
          
          .footer p {
            margin: 3px 0;
          }
          
          .merry-christmas {
            font-size: 12px;
            color: #2d5a3f;
            font-weight: bold;
          }
          
          @media print {
            body {
              background: white !important;
              padding: 0 !important;
            }
            .voucher-container {
              border: 4px solid #c41e3a !important;
              box-shadow: none !important;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div class="border-pattern-top"></div>
          <div class="border-pattern-bottom"></div>
          
          <span class="corner-decoration corner-tl">🎄</span>
          <span class="corner-decoration corner-tr">⭐</span>
          <span class="corner-decoration corner-bl">🎁</span>
          <span class="corner-decoration corner-br">🎅</span>
          
          <div class="company-header">
            <img 
              src="/lovable-uploads/great-pearl-coffee-logo.png" 
              alt="Great Pearl Coffee Factory Logo" 
              class="company-logo"
            />
            <div class="company-name">Great Pearl Coffee Factory</div>
            <div class="company-details">
              Specialty Coffee Processing & Export | +256781121639 / +256778536681<br/>
              www.greatpearlcoffee.com | Uganda Coffee Development Authority Licensed
            </div>
          </div>
          
          <div class="voucher-title">🎄 Christmas Voucher ${voucher.year} 🎄</div>
          <div class="voucher-subtitle">Season's Greetings & Thank You for Your Dedication!</div>
          
          <div class="recipient-section">
            <div class="presented-to">Presented to</div>
            <div class="recipient-name">${voucher.employee_name}</div>
            
            <div class="amount-box">
              <div class="amount-label">Voucher Value</div>
              <div class="amount-value">UGX ${voucher.voucher_amount.toLocaleString()}</div>
            </div>
            
            <div class="ranking-badge">
              🏆 Ranked #${voucher.performance_rank} in Performance (Score: ${voucher.performance_score}%)
            </div>
          </div>
          
          <div class="message-section">
            "${voucher.christmas_message}"
          </div>
          
          <div class="voucher-code-section">
            <div class="code-label">Voucher Code</div>
            <div class="code-value">${voucher.voucher_code}</div>
          </div>
          
          <div class="footer">
            <p>Valid for redemption until January 31, ${voucher.year + 1}</p>
            <p class="merry-christmas">🎄 Merry Christmas & Happy New Year! 🎄</p>
            <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Claimed: ${voucher.claimed_at ? new Date(voucher.claimed_at).toLocaleDateString('en-GB') : 'Pending'}</p>
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

  // No voucher yet
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

  // Already claimed - show "Oops" message
  if (voucher.claimed_at) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-orange-50 via-white to-red-50 border-4 border-orange-500 p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white text-center relative">
            <div className="absolute top-2 left-4 text-2xl">🎄</div>
            <div className="absolute top-2 right-4 text-2xl">🎁</div>
            <AlertCircle className="h-10 w-10 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Oops! Already Claimed</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-gray-600 mb-3">
                You already claimed this voucher on:
              </p>
              <p className="text-lg font-bold text-orange-600">
                {new Date(voucher.claimed_at).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Voucher summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-green-700 text-lg">
                  UGX {voucher.voucher_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rank:</span>
                <span className="font-bold">
                  {getRankEmoji(voucher.performance_rank)} #{voucher.performance_rank}
                </span>
              </div>
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Voucher Code</p>
                <p className="text-xl font-mono font-bold text-red-600 tracking-wider">
                  {voucher.voucher_code}
                </p>
              </div>
            </div>

            {/* Print button */}
            <Button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Voucher Again
            </Button>

            <p className="text-center text-xs text-gray-500">
              🎄 Merry Christmas from Great Pearl Coffee! 🎄
            </p>
          </div>

          {/* Footer decoration */}
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-green-500 h-2" />
        </DialogContent>
      </Dialog>
    );
  }

  // Not claimed yet - show full voucher with claim button
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

        <div className="p-6 space-y-5">
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
            <Button
              onClick={onClaim}
              disabled={claiming}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Gift className="h-4 w-4 mr-2" />
              {claiming ? 'Claiming...' : 'Claim Voucher'}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Voucher
            </Button>
          </div>
        </div>

        {/* Footer decoration */}
        <div className="bg-gradient-to-r from-green-600 via-green-500 to-red-600 h-3" />
      </DialogContent>
    </Dialog>
  );
};

export default ChristmasVoucherModal;
