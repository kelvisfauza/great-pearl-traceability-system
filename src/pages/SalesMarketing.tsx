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

  const salesData = [
    { month: "Jan", domestic: 120, export: 280, target: 350 },
    { month: "Feb", domestic: 135, export: 310, target: 400 },
    { month: "Mar", domestic: 150, export: 285, target: 420 },
    { month: "Apr", domestic: 142, export: 325, target: 450 },
  ];

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

  const handleCreateContract = (formData: FormData) => {
    addContract({
      customerName: customers.find(c => c.id === formData.get('customerId'))?.name || '',
      quantity: formData.get('quantity') as string,
      price: parseInt(formData.get('price') as string),
      deliveryDate: formData.get('deliveryDate') as string,
      status: 'Draft'
    });
    setIsContractOpen(false);
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sales-form">Sales Form</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sales-form" className="space-y-4">
            <SalesForm />
            <SalesHistory />
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
                          <Label htmlFor="customerId">Customer</Label>
                          <Select name="customerId" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input id="quantity" name="quantity" placeholder="e.g., 500 bags" required />
                        </div>
                        <div>
                          <Label htmlFor="price">Price per Unit</Label>
                          <Input id="price" name="price" placeholder="e.g., 180" required />
                        </div>
                        <div>
                          <Label htmlFor="deliveryDate">Delivery Date</Label>
                          <Input id="deliveryDate" name="deliveryDate" type="date" required />
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
                <CardDescription>Monthly sales breakdown - domestic vs export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.map((data, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-12 text-sm font-medium">{data.month}</div>
                      <div className="flex-1">
                        <div className="flex space-x-2 mb-1">
                          <div className="bg-green-500 h-6 rounded" style={{ width: `${(data.domestic / 200) * 100}%` }}></div>
                          <div className="bg-blue-500 h-6 rounded" style={{ width: `${(data.export / 200) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Domestic: {data.domestic}K</span>
                          <span>Export: {data.export}K</span>
                          <span>Target: {data.target}K</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <Badge variant={data.domestic + data.export >= data.target ? "default" : "secondary"}>
                          {Math.round(((data.domestic + data.export) / data.target) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-6 mt-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span>Domestic Sales</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    <span>Export Sales</span>
                  </div>
                </div>
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
                      {["Germany", "USA", "UK", "Japan"].map((country, index) => (
                        <div key={country} className="flex justify-between text-sm">
                          <span>{country}</span>
                          <span className="text-green-600">{25 - index * 3}%</span>
                        </div>
                      ))}
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
