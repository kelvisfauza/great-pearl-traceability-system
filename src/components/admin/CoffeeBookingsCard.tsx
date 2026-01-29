import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookMarked, Plus, Calendar, Coffee, TrendingDown } from 'lucide-react';
import { useCoffeeBookings } from '@/hooks/useCoffeeBookings';
import { format } from 'date-fns';
import CreateBookingDialog from './CreateBookingDialog';
import BookingDetailsDialog from './BookingDetailsDialog';

const CoffeeBookingsCard = () => {
  const { bookings, loading } = useCoffeeBookings();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'partially_fulfilled');
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      active: { variant: 'default', label: 'Active' },
      partially_fulfilled: { variant: 'secondary', label: 'Partial' },
      fulfilled: { variant: 'outline', label: 'Fulfilled' },
      expired: { variant: 'destructive', label: 'Expired' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="border-2 animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BookMarked className="h-5 w-5 text-blue-600" />
              </div>
              <span>Coffee Bookings (Hedging)</span>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Booking
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeBookings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No active bookings</p>
              <p className="text-sm">Create a booking to hedge prices for suppliers</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activeBookings.slice(0, 5).map(booking => (
                <div 
                  key={booking.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedBooking(booking.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{booking.supplier_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Coffee className="h-3 w-3" />
                        <span>{booking.coffee_type}</span>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Booked:</span>{' '}
                      <span className="font-medium">{booking.booked_quantity_kg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining:</span>{' '}
                      <span className="font-medium text-amber-600">{booking.remaining_quantity_kg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>{' '}
                      <span className="font-medium text-green-600">{formatCurrency(booking.booked_price_per_kg)}/kg</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Expires: {format(new Date(booking.expiry_date), 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeBookings.length > 5 && (
            <p className="text-sm text-center text-muted-foreground">
              +{activeBookings.length - 5} more bookings
            </p>
          )}

          <div className="pt-3 border-t flex justify-between text-sm">
            <span className="text-muted-foreground">Total Active: {activeBookings.length}</span>
            <span className="text-muted-foreground">
              Total Hedged: {activeBookings.reduce((sum, b) => sum + b.remaining_quantity_kg, 0).toLocaleString()} kg
            </span>
          </div>
        </CardContent>
      </Card>

      <CreateBookingDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />

      {selectedBooking && (
        <BookingDetailsDialog
          bookingId={selectedBooking}
          open={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
        />
      )}
    </>
  );
};

export default CoffeeBookingsCard;
