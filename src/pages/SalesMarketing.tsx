import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Users, DollarSign, Target, Plus, Search, Eye, Edit, Send } from "lucide-react";
import { useState } from "react";
import { useSalesMarketing } from "@/hooks/useSalesMarketing";
import SalesForm from "@/components/sales/SalesForm";
import SalesHistory from "@/components/sales/SalesHistory";
import { ContractFileUpload } from "@/components/sales/ContractFileUpload";
import { supabase } from "@/integrations/supabase/client";

const SalesMarketing = () => {
  const {
    customers,
    campaigns,
    contracts,
    loading,
    addCustomer,
    addCampaign,
    addContract,
    updateContractStatus,
    getStats
  } = useSalesMarketing();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);

  const stats = getStats();

  // Get real monthly sales data from sales_transactions
  const monthlySalesData = stats.monthlySalesData || [];
  
  // Get top markets from real customer data
  const countryDistribution = customers.reduce((acc: Record<string, number>, customer) => {
    acc[customer.country] = (acc[customer.country] || 0) + 1;
    return acc;
  }, {});
  
  const topMarkets = Object.entries(countryDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([country, count]) => ({
      country,
      percentage: Math.round((count / customers.length) * 100)
    }));

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = (formData: FormData) => {
    addCustomer({
      name: formData.get('name') as string,
      country: formData.get('country') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: 'Active'
    });
    setIsAddCustomerOpen(false);
  };

  const handleAddCampaign = (formData: FormData) => {
    addCampaign({
      name: formData.get('name') as string,
      budget: parseInt(formData.get('budget') as string),
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: 'Planning'
    });
    setIsAddCampaignOpen(false);
  };

  const handleCreateContract = async (formData: FormData) => {
    const ourRef = formData.get('our_ref') as string;
    const buyer = formData.get('buyer') as string;
    const file = formData.get('file') as File;

    if (!file || !ourRef || !buyer) return;

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${ourRef}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Save to database
      await supabase
        .from('contract_files')
        .insert({
          our_ref: ourRef,
          buyer: buyer,
          file_url: publicUrl,
          file_name: file.name
        });

      setIsContractOpen(false);
    } catch (error) {
      console.error('Error creating contract:', error);
    }
  };

  const handleSendContract = (contractId: string) => {
    updateContractStatus(contractId, "Pending");
  };

  if (loading) {
    return (
      <Layout title="Sales & Marketing" subtitle="Loading...">
        <div>Loading sales and marketing data...</div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Sales & Marketing" 
      subtitle="Manage sales contracts, customers, and marketing initiatives"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Sales</p>
                  <p className="text-2xl font-bold">{stats.monthlySales}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                  <p className="text-xs text-blue-600">+{customers.length - 3} new this month</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Export Revenue</p>
                  <p className="text-2xl font-bold">{stats.exportRevenue}</p>
                  <p className="text-xs text-purple-600">73% of total sales</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
                  <p className="text-xs text-amber-600">ROI: +{stats.activeCampaigns * 15}%</p>
                </div>
                <Target className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales-form" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sales-form">Sales Form</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="contract-files">Contract Files</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sales-form" className="space-y-4">
            <SalesForm />
            <SalesHistory />
          </TabsContent>

          <TabsContent value="contract-files" className="space-y-4">
            <ContractFileUpload />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>Manage your coffee buyers and relationships</CardDescription>
                  </div>
                  <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                        <DialogDescription>Enter customer information to add them to your database.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); handleAddCustomer(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Company Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input id="country" name="country" required />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" required />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input id="phone" name="phone" required />
                        </div>
                        <Button type="submit" className="w-full">Add Customer</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.country}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{customer.email}</div>
                            <div className="text-gray-500">{customer.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{customer.orders}</TableCell>
                        <TableCell className="font-semibold text-green-600">{customer.value}</TableCell>
                        <TableCell>
                          <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sales Contracts</CardTitle>
                    <CardDescription>Manage coffee sales contracts and agreements</CardDescription>
                  </div>
                  <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Contract
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Sales Contract</DialogTitle>
                        <DialogDescription>Create a new contract for coffee sales.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); handleCreateContract(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                        <div>
                          <Label htmlFor="our_ref">Our Ref</Label>
                          <Input id="our_ref" name="our_ref" placeholder="e.g., CONT-2024-001" required />
                        </div>
                        <div>
                          <Label htmlFor="buyer">Buyer (Who Issued the Contract)</Label>
                          <Input id="buyer" name="buyer" placeholder="e.g., ABC Coffee Importers" required />
                        </div>
                        <div>
                          <Label htmlFor="file">Contract File</Label>
                          <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx" required />
                        </div>
                        <Button type="submit" className="w-full">Create Contract</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.customerName}</TableCell>
                        <TableCell>{contract.quantity}</TableCell>
                        <TableCell>{contract.price}</TableCell>
                        <TableCell>{contract.deliveryDate}</TableCell>
                        <TableCell>
                          <Badge variant={
                            contract.status === "Signed" ? "default" :
                            contract.status === "Pending" ? "secondary" : "outline"
                          }>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSendContract(contract.id)}
                              disabled={contract.status === "Signed"}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Marketing Campaigns</CardTitle>
                    <CardDescription>Track marketing initiatives and ROI</CardDescription>
                  </div>
                  <Dialog open={isAddCampaignOpen} onOpenChange={setIsAddCampaignOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Campaign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Marketing Campaign</DialogTitle>
                        <DialogDescription>Plan a new marketing campaign to reach potential customers.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); handleAddCampaign(new FormData(e.target as HTMLFormElement)); }} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Campaign Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="budget">Budget</Label>
                          <Input id="budget" name="budget" placeholder="e.g., 25000" required />
                        </div>
                        <div>
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input id="startDate" name="startDate" type="date" required />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date</Label>
                          <Input id="endDate" name="endDate" type="date" required />
                        </div>
                        <Button type="submit" className="w-full">Create Campaign</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            campaign.status === "Active" ? "default" :
                            campaign.status === "Planning" ? "secondary" : "outline"
                          }>
                            {campaign.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Budget:</span> ${campaign.budget.toLocaleString()}
                        </div>
                        <div className="text-green-600 font-medium">
                          <span className="text-gray-600 font-normal">ROI:</span> {campaign.roi}%
                        </div>
                        <div>
                          <span className="font-medium">Start:</span> {campaign.startDate}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {campaign.endDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
                <CardDescription>Monthly sales breakdown from actual transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlySalesData.length > 0 ? (
                  <div className="space-y-4">
                    {monthlySalesData.map((data, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-16 text-sm font-medium">{data.month}</div>
                        <div className="flex-1">
                          <div className="flex space-x-2 mb-1">
                            <div 
                              className="bg-primary h-6 rounded flex items-center justify-center text-xs text-white px-2" 
                              style={{ width: `${Math.max((data.total / stats.totalContractValue) * 100, 5)}%` }}
                            >
                              {data.count} sales
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total: UGX {(data.total / 1000000).toFixed(1)}M</span>
                            <span>Weight: {(data.weight / 1000).toFixed(1)} tonnes</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sales data available yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Analysis</CardTitle>
                <CardDescription>Customer distribution and market insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Top Markets</h4>
                    <div className="space-y-2">
                      {topMarkets.length > 0 ? (
                        topMarkets.map((market) => (
                          <div key={market.country} className="flex justify-between text-sm">
                            <span>{market.country}</span>
                            <span className="text-green-600">{market.percentage}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No customer data yet</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Customer Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active</span>
                        <span className="text-green-600">{customers.filter(c => c.status === "Active").length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span className="text-amber-600">{customers.filter(c => c.status === "Pending").length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total</span>
                        <span className="font-medium">{customers.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SalesMarketing;
