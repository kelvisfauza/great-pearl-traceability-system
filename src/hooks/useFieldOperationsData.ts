import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FarmerProfile {
  id: string;
  full_name: string;
  phone: string;
  village: string;
  parish?: string;
  subcounty?: string;
  coffee_type: string;
  gps_latitude?: number;
  gps_longitude?: number;
  photo_url?: string;
  id_photo_url?: string;
  notes?: string;
  total_purchases_kg: number;
  outstanding_advance: number;
  created_by: string;
  created_at: string;
}

export interface FieldPurchase {
  id: string;
  farmer_id?: string;
  farmer_name: string;
  coffee_type: string;
  category: string;
  kgs_purchased: number;
  unit_price: number;
  total_value: number;
  advance_deducted: number;
  quality_notes?: string;
  moisture_percentage?: number;
  image_url?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  purchase_date: string;
  delivery_slip_generated: boolean;
  status: string;
  created_by: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  district: string;
  villages_visited: string;
  farmers_visited: string[];
  total_kgs_mobilized: number;
  challenges?: string;
  actions_needed?: string;
  submitted_by: string;
  submitted_at: string;
}

export interface FacilitationRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  finance_approved?: boolean;
  finance_approved_by?: string;
  finance_approved_at?: string;
  admin_approved?: boolean;
  admin_approved_by?: string;
  admin_approved_at?: string;
  rejection_reason?: string;
  requestedby: string;
  daterequested: string;
  created_at: string;
  details?: any;
}

export interface AttendanceLog {
  id: string;
  field_agent: string;
  check_in_time: string;
  check_in_gps_latitude?: number;
  check_in_gps_longitude?: number;
  check_out_time?: string;
  check_out_gps_latitude?: number;
  check_out_gps_longitude?: number;
  duration_minutes?: number;
  location_name?: string;
  date: string;
}

export const useFieldOperationsData = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [purchases, setPurchases] = useState<FieldPurchase[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [facilitationRequests, setFacilitationRequests] = useState<FacilitationRequest[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching field operations data...');

      const [farmersRes, purchasesRes, reportsRes, facilitationRes, attendanceRes] = await Promise.all([
        supabase.from('farmer_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('field_purchases').select('*').order('purchase_date', { ascending: false }),
        supabase.from('daily_reports').select('*').order('report_date', { ascending: false }),
        supabase.from('approval_requests').select('*')
          .eq('department', 'Field Operations')
          .order('created_at', { ascending: false }),
        supabase.from('field_attendance_logs').select('*').order('date', { ascending: false })
      ]);

      // Check for errors in any response
      if (farmersRes.error) {
        console.error('❌ Farmers fetch error:', farmersRes.error);
        throw new Error(`Farmers: ${farmersRes.error.message}`);
      }
      if (purchasesRes.error) {
        console.error('❌ Purchases fetch error:', purchasesRes.error);
        throw new Error(`Purchases: ${purchasesRes.error.message}`);
      }
      if (reportsRes.error) {
        console.error('❌ Reports fetch error:', reportsRes.error);
        throw new Error(`Reports: ${reportsRes.error.message}`);
      }
      if (facilitationRes.error) {
        console.error('❌ Facilitation fetch error:', facilitationRes.error);
        throw new Error(`Facilitation: ${facilitationRes.error.message}`);
      }
      if (attendanceRes.error) {
        console.error('❌ Attendance fetch error:', attendanceRes.error);
        throw new Error(`Attendance: ${attendanceRes.error.message}`);
      }

      // Set the data
      setFarmers(farmersRes.data || []);
      setPurchases(purchasesRes.data || []);
      setDailyReports(reportsRes.data || []);
      setFacilitationRequests(facilitationRes.data || []);
      setAttendanceLogs(attendanceRes.data || []);

      console.log('✅ Field operations data loaded:', {
        farmers: farmersRes.data?.length || 0,
        purchases: purchasesRes.data?.length || 0,
        reports: reportsRes.data?.length || 0,
        facilitation: facilitationRes.data?.length || 0,
        attendance: attendanceRes.data?.length || 0
      });

    } catch (error: any) {
      console.error('❌ Field operations fetch error:', error);
      toast({
        title: 'Error Loading Field Operations Data',
        description: error.message || 'Failed to load field data. Please check your permissions.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addFarmer = async (farmerData: any) => {
    try {
      const { error } = await supabase.from('farmer_profiles').insert([farmerData]);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Farmer added successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const addPurchase = async (purchaseData: any) => {
    try {
      // Generate batch number for store record
      const batchNumber = `FLD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
      
      // Insert field purchase
      const { data: fieldPurchase, error: fieldError } = await supabase
        .from('field_purchases')
        .insert([{
          ...purchaseData,
          delivery_slip_generated: false,
          status: 'pending_delivery'
        }])
        .select()
        .single();
      
      if (fieldError) throw fieldError;

      // Create store record
      const storeRecord = {
        batch_number: batchNumber,
        supplier_name: purchaseData.farmer_name || 'Field Purchase',
        coffee_type: purchaseData.coffee_type,
        kilograms: purchaseData.kgs_purchased,
        bags: Math.ceil(purchaseData.kgs_purchased / 60),
        date: purchaseData.purchase_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        created_by: `Field Operations - ${purchaseData.created_by}`
      };

      const { error: storeError } = await supabase
        .from('coffee_records')
        .insert([storeRecord]);
      
      if (storeError) {
        console.error('Store record creation failed:', storeError);
      }

      // Update inventory
      const bags = Math.ceil(purchaseData.kgs_purchased / 60);
      
      // Check if inventory item exists for this coffee type and location
      const { data: existingItem } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('coffee_type', purchaseData.coffee_type)
        .eq('location', 'Field Collection')
        .single();

      if (existingItem) {
        // Update existing inventory
        const updatedBatchNumbers = [...(existingItem.batch_numbers || []), batchNumber];
        
        const { error: invError } = await supabase
          .from('inventory_items')
          .update({
            total_kilograms: existingItem.total_kilograms + purchaseData.kgs_purchased,
            total_bags: existingItem.total_bags + bags,
            batch_numbers: updatedBatchNumbers,
            last_updated: new Date().toISOString(),
            status: 'In Stock'
          })
          .eq('id', existingItem.id);
        
        if (invError) {
          console.error('Inventory update failed:', invError);
        }
      } else {
        // Create new inventory item
        const { error: invError } = await supabase
          .from('inventory_items')
          .insert([{
            coffee_type: purchaseData.coffee_type,
            total_kilograms: purchaseData.kgs_purchased,
            total_bags: bags,
            batch_numbers: [batchNumber],
            location: 'Field Collection',
            status: 'In Stock'
          }]);
        
        if (invError) {
          console.error('Inventory creation failed:', invError);
        }
      }
      
      toast({ 
        title: 'Success', 
        description: 'Purchase recorded - field, store & inventory updated',
        duration: 4000
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const submitDailyReport = async (reportData: any) => {
    try {
      const { error } = await supabase.from('daily_reports').insert([reportData]);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Daily report submitted successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const requestFacilitation = async (requestData: any) => {
    try {
      const approvalRequest = {
        type: 'Field Financing Request',
        title: `${requestData.request_type} - Field Financing`,
        description: requestData.purpose,
        amount: requestData.amount_requested,
        department: 'Field Operations',
        requestedby: requestData.requested_by,
        daterequested: new Date().toISOString().split('T')[0],
        status: 'Pending',
        priority: 'Medium',
        details: {
          request_type: requestData.request_type,
          date_needed: requestData.date_needed,
          evidence_url: requestData.evidence_url || null
        }
      };

      const { error } = await supabase.from('approval_requests').insert([approvalRequest]);
      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: 'Financing request submitted for approval' 
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const checkIn = async (agentName: string, locationName: string, latitude?: number, longitude?: number) => {
    try {
      const { error } = await supabase.from('field_attendance_logs').insert([{
        field_agent: agentName,
        location_name: locationName,
        check_in_gps_latitude: latitude,
        check_in_gps_longitude: longitude
      }]);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Checked in successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const checkOut = async (logId: string, latitude?: number, longitude?: number) => {
    try {
      const checkOutTime = new Date();
      const log = attendanceLogs.find(l => l.id === logId);
      const duration = log ? Math.floor((checkOutTime.getTime() - new Date(log.check_in_time).getTime()) / 60000) : 0;

      const { error } = await supabase
        .from('field_attendance_logs')
        .update({
          check_out_time: checkOutTime.toISOString(),
          check_out_gps_latitude: latitude,
          check_out_gps_longitude: longitude,
          duration_minutes: duration
        })
        .eq('id', logId);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Checked out successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    farmers,
    purchases,
    dailyReports,
    facilitationRequests,
    attendanceLogs,
    addFarmer,
    addPurchase,
    submitDailyReport,
    requestFacilitation,
    checkIn,
    checkOut,
    refetch: fetchData
  };
};
