
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Users, DollarSign, Package, Plus, Search, Eye } from "lucide-react";
import { useState } from "react";

const SalesMarketing = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const customers = [
    { id: 1, name: "Global Coffee Imports Ltd", country: "Germany", status: "Active", orders: 24, value: "€450,000" },
    { id: 2, name: "American Bean Co.", country: "USA", status: "Active", orders: 18, value: "$320,000" },
    { id: 3, name: "Tokyo Coffee House", country: "Japan", status: "Pending", orders: 8, value: "¥2,800,000" },
    { id: 4, name: "London Roasters", country: "UK", status: "Active", orders: 15, value: "£180,000" },
  ];

  const salesData = [
    { month: "Jan", domestic: 120, export: 280, target: 350 },
    { month: "Feb", domestic: 135, export: 310, target: 400 },
    { month: "Mar", domestic: 150, export: 285, target: 420 },
    { month: "Apr", domestic: 142, export: 325, target: 450 },
  ];

  const campaigns = [
    { id: 1, name: "European Market Expansion", status: "Active", budget: "$25,000", roi: "+18%" },
    { id: 2, name: "Premium Coffee Launch", status: "Planning", budget: "$40,000", roi: "Projected +25%" },
    { id: 3, name: "Trade Show Participation", status: "Completed", budget: "$15,000", roi: "+12%" },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <p className="text-2xl font-bold">$847K</p>
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
                  <p className="text-2xl font-bold">143</p>
                  <p className="text-xs text-blue-600">+8 new this month</p>
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
                  <p className="text-2xl font-bold">$623K</p>
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
                  <p className="text-sm font-medium text-gray-600">Orders Pending</p>
                  <p className="text-2xl font-bold">28</p>
                  <p className="text-xs text-amber-600">Worth $156K</p>
                </div>
                <Package className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Management</CardTitle>
                  <CardDescription>Manage your coffee buyers and contracts</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
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
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.country} • {customer.orders} orders</p>
                      <p className="text-sm font-semibold text-green-600">{customer.value}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                        {customer.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketing Campaigns */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Marketing Campaigns</CardTitle>
                  <CardDescription>Track marketing initiatives and ROI</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge variant={
                        campaign.status === "Active" ? "default" :
                        campaign.status === "Planning" ? "secondary" : "outline"
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Budget: {campaign.budget}</span>
                      <span className="text-green-600 font-medium">ROI: {campaign.roi}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Performance Chart */}
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
      </div>
    </Layout>
  );
};

export default SalesMarketing;
