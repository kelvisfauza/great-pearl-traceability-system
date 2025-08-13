import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Key, Eye, EyeOff, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  role: z.enum(["Administrator", "Manager", "Supervisor", "User", "Guest"]),
  salary: z.number().min(0, "Salary must be positive"),
  permissions: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const availablePermissions = [
  "Human Resources", "Finance", "Procurement", "Quality Control",
  "Processing", "Store Management", "Inventory", "Sales & Marketing",
  "Field Operations", "Data Analysis", "Reports", "Logistics"
];

const departments = [
  "Human Resources", "Finance", "Operations", "Quality Control",
  "Sales", "Procurement", "Administration", "Field Operations"
];

export default function UserCreationForm() {
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      position: "",
      department: "",
      role: "User",
      salary: 0,
      permissions: [],
    },
  });

  const handleSubmit = async (values: UserFormValues) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      console.log('Creating user with Supabase edge function:', values);
      
      const employeeData = {
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        password: values.password,
        phone: values.phone?.trim() || "",
        position: values.position.trim(),
        department: values.department.trim(),
        role: values.role,
        salary: Number(values.salary),
        permissions: Array.isArray(values.permissions) ? values.permissions : [],
      };

      // Use Supabase edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { employeeData }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      form.reset();
      
      toast({
        title: "User Created Successfully",
        description: `User ${employeeData.name} has been created successfully.`
      });
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Failed to create user. Please try again.";
      
      if (error.message) {
        if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes('email')) {
          errorMessage = "Invalid email address or email already exists.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Login Username)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="user@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          {...field} 
                          placeholder="Enter password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+256 700 000 000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter job position" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availablePermissions.map((permission) => (
                      <FormField
                        key={permission}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={permission}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), permission])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== permission
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal">
                                {permission}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="submit" disabled={isCreating}>
                <Key className="h-4 w-4 mr-2" />
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}