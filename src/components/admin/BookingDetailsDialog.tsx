import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useCoffeeBookings, CoffeeBooking, BookingDelivery } from '@/hooks/useCoffeeBookings';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Coffee, Calendar, Package, Truck, XCircle, Loader2, 
  CheckCircle, Clock, AlertTriangle, Archive
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookingDetailsDialogProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookingDetailsDialog = ({ bookingId, open, onOpenChange }: BookingDetailsDialogProps) => {
  const { bookings, recordDelivery, cancelBooking, closeBooking, getBookingDeliveries } = useCoffeeBookings();
  const { employee } = useAuth();
  
  const [deliveries, setDeliveries] = useState<BookingDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryKg, setDeliveryKg] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  const booking = bookings.find(b => b.id === bookingId);

  useEffect(() => {
    if (open && bookingId) {
      getBookingDeliveries(bookingId).then(setDeliveries);
    }
  }, [open, bookingId, getBookingDeliveries]);

  if (!booking) return null;

  const progressPercent = (booking.delivered_quantity_kg / booking.booked_quantity_kg) * 100;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'partially_fulfilled': return <Package className="h-4 w-4 text-amber-500" />;
      case 'fulfilled': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'closed': return <Archive className="h-4 w-4 text-slate-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      active: { variant: 'default', label: 'Active' },
      partially_fulfilled: { variant: 'secondary', label: 'Partially Fulfilled' },
      fulfilled: { variant: 'outline', label: 'Fulfilled' },
      expired: { variant: 'destructive', label: 'Expired' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      closed: { variant: 'outline', label: 'Closed' }
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    );
  };

  const handleRecordDelivery = async () => {
    if (!deliveryKg || parseFloat(deliveryKg) <= 0) return;
    
    const kg = parseFloat(deliveryKg);
    if (kg > booking.remaining_quantity_kg) {
      return;
    }

    setLoading(true);
    await recordDelivery(bookingId, kg, employee?.name || 'Unknown');
    setDeliveryKg('');
    const updatedDeliveries = await getBookingDeliveries(bookingId);
    setDeliveries(updatedDeliveries);
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    await cancelBooking(bookingId);
    setShowCancelConfirm(false);
    setLoading(false);
    onOpenChange(false);
  };

  const handleClose = async () => {
    setLoading(true);
    await closeBooking(bookingId, closeReason);
    setShowCloseConfirm(false);
    setCloseReason('');
    setLoading(false);
    onOpenChange(false);
  };

  const canModify = booking.status === 'active' || booking.status === 'partially_fulfilled';
  const canClose = booking.status === 'partially_fulfilled';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Booking Details
              </div>
              {getStatusBadge(booking.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Supplier Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold text-lg">{booking.supplier_name}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Coffee className="h-3 w-3" />
                <span>{booking.coffee_type}</span>
                <span>•</span>
                <span>Booked: {format(new Date(booking.booking_date), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            {/* Quantity Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Delivery Progress</span>
                <span>{booking.delivered_quantity_kg.toLocaleString()} / {booking.booked_quantity_kg.toLocaleString()} kg</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Delivered: {progressPercent.toFixed(1)}%</span>
                <span className="text-amber-600 font-medium">
                  Remaining: {booking.remaining_quantity_kg.toLocaleString()} kg
                </span>
              </div>
            </div>

            {/* Price & Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">Hedged Price</p>
                <p className="text-xl font-bold text-green-800 dark:text-green-200">
                  {formatCurrency(booking.booked_price_per_kg)}/kg
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expiry Date
                </p>
                <p className="font-semibold">
                  {format(new Date(booking.expiry_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            )}

            <Separator />

            {/* Record Delivery */}
            {canModify && (
              <div className="space-y-2">
                <Label>Record Delivery</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Max: ${booking.remaining_quantity_kg.toLocaleString()} kg`}
                    value={deliveryKg}
                    onChange={(e) => setDeliveryKg(e.target.value)}
                    max={booking.remaining_quantity_kg}
                  />
                  <Button 
                    onClick={handleRecordDelivery}
                    disabled={loading || !deliveryKg || parseFloat(deliveryKg) <= 0 || parseFloat(deliveryKg) > booking.remaining_quantity_kg}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
                    Record
                  </Button>
                </div>
              </div>
            )}

            {/* Delivery History */}
            {deliveries.length > 0 && (
              <div className="space-y-2">
                <Label>Delivery History</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-2">
                  {deliveries.map(delivery => (
                    <div key={delivery.id} className="flex justify-between items-center p-2 rounded bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span>{format(new Date(delivery.delivery_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <span className="font-medium">{delivery.delivered_kg.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                {canClose && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setShowCloseConfirm(true)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Close Booking
                  </Button>
                )}
                {canModify && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel Booking
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking for {booking.supplier_name}. 
              The hedged price of {formatCurrency(booking.booked_price_per_kg)}/kg will no longer be valid.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Booking?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will close the booking for {booking.supplier_name} with partial delivery.
                </p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <span className="font-medium text-green-600">{booking.delivered_quantity_kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining (will be written off):</span>
                    <span className="font-medium text-amber-600">{booking.remaining_quantity_kg.toLocaleString()} kg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeReason">Reason for closing (optional)</Label>
                  <Textarea
                    id="closeReason"
                    placeholder="e.g., Supplier unable to deliver remaining quantity"
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Open</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Close Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BookingDetailsDialog;
