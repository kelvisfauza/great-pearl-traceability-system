import React, { useState } from 'react';
import { useChristmasVoucher } from '@/hooks/useChristmasVoucher';
import ChristmasVoucherModal from './ChristmasVoucherModal';

const ChristmasGiftBox: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { voucher, loading, claimVoucher, claiming } = useChristmasVoucher();
  
  const isChristmasPeriod = new Date() < new Date('2026-01-01');
  
  if (!isChristmasPeriod || loading) return null;

  const handleGiftClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Floating gift boxes */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
        {/* Main interactive gift box */}
        <button
          onClick={handleGiftClick}
          className="group relative cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
          title="Click to open your Christmas gift!"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500 to-green-500 opacity-50 blur-xl group-hover:opacity-80 animate-pulse" />
          
          {/* Gift box container */}
          <div className="relative">
            {/* Box base */}
            <div className="w-16 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg border-2 border-red-400 flex items-center justify-center overflow-hidden">
              {/* Vertical ribbon */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-b from-yellow-400 to-yellow-500" />
              {/* Horizontal ribbon */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500" />
              
              {/* Sparkle effects */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse" />
            </div>
            
            {/* Box lid */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[70px] h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-t-md border-2 border-red-400 border-b-0 group-hover:animate-bounce" />
            
            {/* Bow */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2">
              <div className="relative">
                {/* Bow loops */}
                <div className="absolute -left-3 top-0 w-4 h-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full transform -rotate-45 border border-yellow-300" />
                <div className="absolute -right-3 top-0 w-4 h-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full transform rotate-45 border border-yellow-300" />
                {/* Bow center */}
                <div className="relative w-3 h-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full border border-yellow-400 z-10" />
              </div>
            </div>
          </div>
          
          {/* "Open Me" indicator */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs font-bold text-green-600 animate-pulse bg-white/90 px-2 py-0.5 rounded-full shadow">
              🎁 Open Me!
            </span>
          </div>
        </button>
      </div>

      {/* Additional decorative gift boxes */}
      <div className="fixed bottom-32 left-4 z-30 pointer-events-none">
        <div className="w-10 h-9 bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-lg opacity-70 animate-bounce" style={{ animationDelay: '0.5s' }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-red-500" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-red-500" />
        </div>
      </div>

      <div className="fixed bottom-16 left-8 z-30 pointer-events-none">
        <div className="w-8 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg opacity-60 animate-bounce" style={{ animationDelay: '1s' }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-white" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-white" />
        </div>
      </div>

      {/* Voucher Modal */}
      <ChristmasVoucherModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        voucher={voucher}
        onClaim={claimVoucher}
        claiming={claiming}
      />
    </>
  );
};

export default ChristmasGiftBox;
