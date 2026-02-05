 import React from 'react';
 import DashboardLayout from '@/components/DashboardLayout';
 import CoffeeBookingsCard from '@/components/admin/CoffeeBookingsCard';
 
 const CoffeeBookings = () => {
   return (
     <DashboardLayout title="Coffee Bookings" subtitle="Hedging & price management">
       <div className="space-y-6">
         <CoffeeBookingsCard />
       </div>
     </DashboardLayout>
   );
 };
 
 export default CoffeeBookings;