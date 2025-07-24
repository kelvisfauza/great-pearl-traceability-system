
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Employee } from "@/hooks/useEmployees";

const editUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  position: z.string().min(2, "Position is required"),
  department: z.string().min(2, "Department is required"),
  role: z.enum(["Administrator", "Manager", "Supervisor", "User", "Guest"]),
  salary: z.number().min(0, "Salary must be positive"),
  permissions: z.array(z.string()).optional(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

const availablePermissions = [
  "Human Resources", "Finance", "Procurement", "Quality Control",
  "Processing", "Store Management", "Inventory", "Sales & Marketing",
  "Field Operations", "Data Analysis", "Reports", "Logistics"
];

const departments = [
  "Human Resources", "Finance", "Operations", "Quality Control",
  "Sales", "Procurement", "Administration", "Field Operations"
];

interface EditUserFormProps {
  employee: Employee;
  onSubmit: (data: EditUserFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function EditUserForm({ employee, onSubmit, onCancel }: EditUserFormProps) {
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      role: (employee.role as any) || "User",
      salary: Number(employee.salary) || 0,
      permissions: Array.isArray(employee.permissions) ? employee.permissions : [],
    },
  });

  const handleSubmit = async (values: EditUserFormValues) => {
    if (isUpdatingUser) return;
    
    setIsUpdatingUser(true);
    try {
      const updateData = {
        name: values.name.trim(),
        email: values.email.toLowerCase().trim(),
        phone: values.phone?.trim() || "",
        position: values.position.trim(),
        department: values.department.trim(),
        role: values.role,
        salary: Number(values.salary),
        permissions: Array.isArray(values.permissions) ? values.permissions : [],
      };

      await onSubmit(updateData);
    } catch (error) {
      throw error;
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
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
                  <Input {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-1 gap-4">
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
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdatingUser}>
            {isUpdatingUser ? "Updating..." : "Update User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
