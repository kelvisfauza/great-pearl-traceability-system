
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { 
  Plus, 
  Users, 
  MapPin, 
  Building, 
  Coffee, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useFieldOperations } from "@/hooks/useFieldOperations";
import { useToast } from "@/hooks/use-toast";

export default function SupervisorDashboard() {
  const { 
    fieldAgents, 
    buyingStations, 
    collections, 
    stats,
    addFieldAgent,
    addBuyingStation 
  } = useFieldOperations();
  const { toast } = useToast();
  
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);

  const agentForm = useForm({
    defaultValues: {
      name: "",
      region: "",
      phone: "",
      status: "Active"
    }
  });

  const stationForm = useForm({
    defaultValues: {
      name: "",
      location: "",
      capacity: 500,
      managerName: "",
      status: "Operational"
    }
  });

  const onAgentSubmit = async (data: any) => {
    try {
      await addFieldAgent(data);
      setShowAgentModal(false);
      agentForm.reset();
      toast({
        title: "Success",
        description: "Field agent added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add field agent",
        variant: "destructive"
      });
    }
  };

  const onStationSubmit = async (data: any) => {
    try {
      await addBuyingStation(data);
      setShowStationModal(false);
      stationForm.reset();
      toast({
        title: "Success",
        description: "Buying station added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add buying station",
        variant: "destructive"
      });
    }
  };

  // Mock data for pending approvals (this would come from approval system)
  const pendingApprovals = [
    {
      id: "1",
      type: "Expense",
      agentName: "John Doe",
      description: "Transportation costs",
      amount: 50000,
      date: "2024-01-12",
      status: "Pending"
    },
    {
      id: "2",
      type: "Overtime",
      agentName: "Jane Smith",
      description: "Peak season collection",
      hours: 8,
      date: "2024-01-11",
      status: "Pending"
    },
    {
      id: "3",
      type: "Coffee Payment",
      agentName: "Bob Wilson",
      description: "Payment to farmers",
      amount: 2500000,
      date: "2024-01-10",
      status: "Pending"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold">{stats.activeAgents}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Buying Stations</p>
                <p className="text-2xl font-bold">{stats.operationalStations}</p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Collections</p>
                <p className="text-2xl font-bold">{stats.dailyCollections}</p>
              </div>
              <Coffee className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Field Agents</TabsTrigger>
          <TabsTrigger value="stations">Buying Stations</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Field Agents</CardTitle>
                  <CardDescription>Manage field agents and their assignments</CardDescription>
                </div>
                <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Field Agent</DialogTitle>
                    </DialogHeader>
                    <Form {...agentForm}>
                      <form onSubmit={agentForm.handleSubmit(onAgentSubmit)} className="space-y-4">
                        <FormField
                          control={agentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Region</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">Add Agent</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-gray-500">{agent.region}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={agent.status === "Active" ? "default" : "secondary"}>
                        {agent.status}
                      </Badge>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Buying Stations</CardTitle>
                  <CardDescription>Manage buying stations and capacity</CardDescription>
                </div>
                <Dialog open={showStationModal} onOpenChange={setShowStationModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Station
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Buying Station</DialogTitle>
                    </DialogHeader>
                    <Form {...stationForm}>
                      <form onSubmit={stationForm.handleSubmit(onStationSubmit)} className="space-y-4">
                        <FormField
                          control={stationForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Station Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={stationForm.control}
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
                          control={stationForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity (bags)</FormLabel>
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
                          control={stationForm.control}
                          name="managerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Manager Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">Add Station</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buyingStations.map((station) => (
                  <div key={station.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{station.name}</h4>
                      <Badge variant={station.status === "Operational" ? "default" : "destructive"}>
                        {station.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      {station.location}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span>Manager: {station.manager}</span>
                      <span>{station.current} / {station.capacity} bags</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and approve field agent requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline">{approval.type}</Badge>
                        <span className="font-medium">{approval.agentName}</span>
                      </div>
                      <p className="text-sm text-gray-600">{approval.description}</p>
                      <p className="text-xs text-gray-400">{approval.date}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {approval.type === "Coffee Payment" || approval.type === "Expense" ? (
                        <span className="font-medium">UGX {approval.amount?.toLocaleString()}</span>
                      ) : (
                        <span className="font-medium">{approval.hours} hours</span>
                      )}
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
