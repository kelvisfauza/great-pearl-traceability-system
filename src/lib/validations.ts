import { z } from "zod";

// Common validation schemas for forms across the application

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  supplier_code: z.string().min(1, "Supplier code is required").max(50, "Code must be less than 50 characters"),
  phone: z.string().regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  location: z.string().min(1, "Location is required").max(200, "Location must be less than 200 characters"),
  active_contracts: z.number().int().min(0).optional(),
  status: z.enum(["Active", "Inactive"]),
});

export const vehicleSchema = z.object({
  name: z.string().min(1, "Vehicle name is required").max(100),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  driver_name: z.string().min(1, "Driver name is required").max(100),
  driver_phone: z.string().regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number").optional().or(z.literal("")),
  route: z.string().min(1, "Route is required"),
  status: z.enum(["Available", "In Transit", "Maintenance"]),
  load_capacity_bags: z.string().refine((val) => !val || !isNaN(parseInt(val)), "Must be a valid number").optional(),
});

export const deliveryRouteSchema = z.object({
  name: z.string().min(1, "Route name is required").max(100),
  locations: z.array(z.string().min(1)).min(2, "At least 2 locations required"),
  distance_km: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number"),
  frequency: z.string().min(1, "Frequency is required"),
  estimated_hours: z.string().refine((val) => !val || !isNaN(parseFloat(val)), "Must be a valid number").optional(),
});

export const verificationCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number"),
  code: z.string().length(4, "Code must be 4 digits"),
});

export const searchHistorySchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  search_term: z.string().min(2, "Search term too short").max(200),
  result_count: z.number().int().min(0),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type DeliveryRouteFormData = z.infer<typeof deliveryRouteSchema>;
export type VerificationCodeData = z.infer<typeof verificationCodeSchema>;
export type SearchHistoryData = z.infer<typeof searchHistorySchema>;
