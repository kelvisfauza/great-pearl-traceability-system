 import React from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { BookMarked, Calendar, Coffee, ArrowRight } from 'lucide-react';
 import { useCoffeeBookings } from '@/hooks/useCoffeeBookings';
 import { format, differenceInDays } from 'date-fns';
 import { Link } from 'react-router-dom';
 
 const UpcomingBookingsWidget = () => {
   const { bookings, loading } = useCoffeeBookings();
 
   const activeBookings = bookings
     .filter(b => b.status === 'active' || b.status === 'partially_fulfilled')
     .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
     .slice(0, 3);
 
   const totalActiveKg = bookings
     .filter(b => b.status === 'active' || b.status === 'partially_fulfilled')
     .reduce((sum, b) => sum + b.remaining_quantity_kg, 0);
 
   if (loading) {
     return (
       <Card className="animate-pulse">
         <CardContent className="p-6">
           <div className="h-24 bg-muted rounded-lg"></div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className="hover:shadow-lg transition-all">
       <CardHeader className="pb-3">
         <CardTitle className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="p-2 rounded-lg bg-blue-500/10">
               <BookMarked className="h-5 w-5 text-blue-600" />
             </div>
             <div>
               <span className="text-base">Upcoming Deliveries</span>
               {totalActiveKg > 0 && (
                 <p className="text-xs text-muted-foreground font-normal">
                   {totalActiveKg.toLocaleString()} kg pending
                 </p>
               )}
             </div>
           </div>
           <Button variant="ghost" size="sm" asChild>
             <Link to="/coffee-bookings" className="flex items-center gap-1">
               View All <ArrowRight className="h-3 w-3" />
             </Link>
           </Button>
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-2">
         {activeBookings.length === 0 ? (
           <p className="text-sm text-muted-foreground text-center py-4">
             No active bookings
           </p>
         ) : (
           activeBookings.map(booking => {
             const daysLeft = differenceInDays(new Date(booking.expiry_date), new Date());
             const isUrgent = daysLeft <= 3;
             
             return (
               <div 
                 key={booking.id}
                 className="flex items-center justify-between p-3 rounded-lg border bg-card"
               >
                 <div className="flex items-center gap-3">
                   <Coffee className="h-4 w-4 text-muted-foreground" />
                   <div>
                     <p className="font-medium text-sm">{booking.supplier_name}</p>
                     <p className="text-xs text-muted-foreground">
                       {booking.remaining_quantity_kg.toLocaleString()} kg {booking.coffee_type}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
                     <Calendar className="h-3 w-3 mr-1" />
                     {format(new Date(booking.expiry_date), 'MMM dd')}
                   </Badge>
                   {isUrgent && (
                     <p className="text-xs text-destructive mt-1">{daysLeft} days left</p>
                   )}
                 </div>
               </div>
             );
           })
         )}
       </CardContent>
     </Card>
   );
 };
 
 export default UpcomingBookingsWidget;