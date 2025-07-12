
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Plus, MapPin, Phone, User, DollarSign, FileText, Clock } from "lucide-react";
import { useFieldOperations } from "@/hooks/useFieldOperations";
import { useToast } from "@/hooks/use-toast";

interface AgentActionProps {
  agent: any;
  onExpenseSubmit: (agentId: string, expense: any) => void;
  onOvertimeRequest: (agentId: string, overtime: any) => void;
  onCoffeePurchase: (agentId: string, purchase: any) => void;
}

const AgentActions = ({ agent, onExpenseSubmit, onOvertimeRequest, onCoffeePurchase }: AgentActionProps) => {
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const { toast } = useToast();
  
  const expenseForm = useForm({
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      date: new Date().toISOString().split('T')[0]
    }
  });

  const overtimeForm = useForm({
    defaultValues: {
      hours: 0,
      date: new Date().toISOString().split('T')[0],
      reason: ""
    }
  });

  const purchaseForm = useForm({
    defaultValues: {
      farmerName: "",
      location: "",
      bags: 0,
      pricePerBag: 0,
      qualityGrade: "Grade A",
      totalAmount: 0
    }
  });

  const handleExpenseSubmit = (data: any) => {
    onExpenseSubmit(agent.id, data);
    setShowExpenseDialog(false);
    expenseForm.reset();
    toast({
      title: "Success",
      description: "Expense submitted for approval"
    });
  };

  const handleOvertimeSubmit = (data: any) => {
    onOvertimeRequest(agent.id, data);
    setShowOvertimeDialog(false);
    overtimeForm.reset();
    toast({
      title: "Success", 
      description: "Overtime request submitted for approval"
    });
  };

  const handlePurchaseSubmit = (data: any) => {
    onCoffeePurchase(agent.id, {
      ...data,
      totalAmount: data.bags * data.pricePerBag,
      agentName: agent.name,
      status: "Awaiting Store Transfer"
    });
    setShowPurchaseDialog(false);
    purchaseForm.reset();
    toast({
      title: "Success",
      description: "Coffee purchase recorded, awaiting payment approval"
    });
  };

  return (
    <div className="flex gap-2">
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Expense
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Expense - {agent.name}</DialogTitle>
          </DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)} className="space-y-4">
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Transportation, meals, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Meals">Meals</SelectItem>
                        <SelectItem value="Accommodation">Accommodation</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (UGX)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Submit Expense</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-1" />
            Overtime
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Overtime - {agent.name}</DialogTitle>
          </DialogHeader>
          <Form {...overtimeForm}>
            <form onSubmit={overtimeForm.handleSubmit(handleOvertimeSubmit)} className="space-y-4">
              <FormField
                control={overtimeForm.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime Hours</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={overtimeForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={overtimeForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Peak season, urgent collection, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Submit Request</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-1" />
            Buy Coffee
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Coffee Purchase - {agent.name}</DialogTitle>
          </DialogHeader>
          <Form {...purchaseForm}>
            <form onSubmit={purchaseForm.handleSubmit(handlePurchaseSubmit)} className="space-y-4">
              <FormField
                control={purchaseForm.control}
                name="farmerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farmer Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="bags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Bags</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="pricePerBag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Bag (UGX)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="qualityGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality Grade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Grade A">Grade A</SelectItem>
                        <SelectItem value="Grade B">Grade B</SelectItem>
                        <SelectItem value="Grade C">Grade C</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Record Purchase</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function FieldAgentManagement() {
  const { fieldAgents, addFieldAgent } = useFieldOperations();
  const { toast } = useToast();

  const handleExpenseSubmitRequest = async (agentId: string, expense: any) => {
    // This would integrate with the approval system
    console.log("Expense submitted:", { agentId, expense });
  };

  const handleOvertimeRequest = async (agentId: string, overtime: any) => {
    // This would integrate with the approval system
    console.log("Overtime requested:", { agentId, overtime });
  };

  const handleCoffeePurchase = async (agentId: string, purchase: any) => {
    // This would create a collection record and payment request
    console.log("Coffee purchase recorded:", { agentId, purchase });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Agent Management</CardTitle>
        <CardDescription>Manage field agents and their operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fieldAgents.map((agent) => (
            <div key={agent.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{agent.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {agent.region}
                    </p>
                  </div>
                </div>
                <Badge variant={agent.status === "Active" ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {agent.phone}
                </div>
                <div>
                  Collections: {agent.collections}
                </div>
                <div>
                  Last Report: {agent.lastReport}
                </div>
              </div>

              <div className="flex justify-end">
                <AgentActions 
                  agent={agent}
                  onExpenseSubmit={handleExpenseSubmitRequest}
                  onOvertimeRequest={handleOvertimeRequest}
                  onCoffeePurchase={handleCoffeePurchase}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
