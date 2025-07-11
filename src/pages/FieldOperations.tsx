
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Truck, Coffee, Plus, Search, Phone } from "lucide-react";
import { useState } from "react";

const FieldOperations = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const fieldAgents = [
    { id: 1, name: "Samuel Mukasa", region: "Bushenyi", phone: "+256 701 234567", status: "Active", collections: "45 bags", lastReport: "2 hours ago" },
    { id: 2, name: "Grace Namukasa", region: "Masaka", phone: "+256 702 345678", status: "Active", collections: "62 bags", lastReport: "4 hours ago" },
    { id: 3, name: "John Mugisha", region: "Ntungamo", phone: "+256 703 456789", status: "Offline", collections: "28 bags", lastReport: "1 day ago" },
    { id: 4, name: "Mary Nakato", region: "Mbarara", phone: "+256 704 567890", status: "Active", collections: "38 bags", lastReport: "1 hour ago" },
  ];

  const buyingStations = [
    { id: 1, name: "Bushenyi Central Station", location: "Bushenyi Town", capacity: "500 bags", current: "342 bags", manager: "Peter Asiimwe", status: "Operational" },
    { id: 2, name: "Masaka Highway Station", location: "Masaka-Kampala Road", capacity: "750 bags", current: "156 bags", manager: "Sarah Nalubega", status: "Operational" },
    { id: 3, name: "Ntungamo Rural Station", location: "Ntungamo Village", capacity: "300 bags", current: "289 bags", manager: "David Tumwine", status: "Near Capacity" },
  ];

  const collections = [
    { id: 1, farmer: "Joseph Bantu", location: "Bushenyi", bags: 12, quality: "Grade A", agent: "Samuel Mukasa", date: "Today", status: "Collected" },
    { id: 2, farmer: "Rose Nambi", location: "Masaka", bags: 8, quality: "Grade B", agent: "Grace Namukasa", date: "Today", status: "In Transit" },
    { id: 3, farmer: "Tom Mwesigye", location: "Ntungamo", bags: 15, quality: "Grade A", agent: "John Mugisha", date: "Yesterday", status: "Delivered" },
    { id: 4, farmer: "Agnes Kyomugisha", location: "Mbarara", bags: 6, quality: "Grade B", agent: "Mary Nakato", date: "Today", status: "Collected" },
  ];

  const filteredAgents = fieldAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout 
      title="Field Operations" 
      subtitle="Manage field agents, buying stations, and rural operations"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-green-600">3 regions covered</p>
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
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-blue-600">75% capacity utilized</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Collections</p>
                  <p className="text-2xl font-bold">173 bags</p>
                  <p className="text-xs text-purple-600">+15% from yesterday</p>
                </div>
                <Coffee className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transport Fleet</p>
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-xs text-amber-600">4 active routes</p>
                </div>
                <Truck className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Field Agents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Field Agents</CardTitle>
                  <CardDescription>Monitor field agent activities and performance</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-gray-500">{agent.region} • {agent.collections}</p>
                      <p className="text-xs text-gray-400">Last report: {agent.lastReport}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={agent.status === "Active" ? "default" : "secondary"}>
                        {agent.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Buying Stations */}
          <Card>
            <CardHeader>
              <CardTitle>Buying Stations</CardTitle>
              <CardDescription>Monitor station capacity and operations</CardDescription>
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
                    <p className="text-sm text-gray-600 mb-2">{station.location}</p>
                    <div className="flex justify-between text-sm">
                      <span>Manager: {station.manager}</span>
                      <span className="font-medium">{station.current} / {station.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          parseInt(station.current) / parseInt(station.capacity) > 0.8 
                            ? 'bg-red-500' 
                            : parseInt(station.current) / parseInt(station.capacity) > 0.6 
                            ? 'bg-amber-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(parseInt(station.current) / parseInt(station.capacity)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Collections */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
            <CardDescription>Latest coffee collections from farmers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{collection.farmer}</p>
                        <p className="text-sm text-gray-500">{collection.location} • {collection.bags} bags</p>
                      </div>
                      <Badge variant="outline">{collection.quality}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Agent: {collection.agent}</p>
                    <p className="text-xs text-gray-400">{collection.date}</p>
                    <Badge variant={
                      collection.status === "Delivered" ? "default" :
                      collection.status === "In Transit" ? "secondary" : "outline"
                    }>
                      {collection.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FieldOperations;
