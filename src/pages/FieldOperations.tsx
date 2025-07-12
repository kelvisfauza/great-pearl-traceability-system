
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Truck, Coffee, Plus, Search, Phone } from "lucide-react";
import { useState } from "react";
import { useFieldOperations } from "@/hooks/useFieldOperations";
import EmptyFieldState from "@/components/field/EmptyFieldState";

const FieldOperations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { 
    fieldAgents, 
    buyingStations, 
    collections, 
    loading, 
    stats,
    addFieldAgent,
    addBuyingStation,
    addCollection
  } = useFieldOperations();

  const filteredAgents = fieldAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAgent = () => {
    // This would open a modal or form to add a new agent
    addFieldAgent({
      name: "New Agent",
      region: "New Region",
      phone: "+256 700 000000",
      status: "Active",
      collections: "0 bags",
      lastReport: "Just added"
    });
  };

  const handleAddStation = () => {
    // This would open a modal or form to add a new station
    addBuyingStation({
      name: "New Station",
      location: "New Location",
      capacity: "500 bags",
      current: "0 bags",
      manager: "New Manager",
      status: "Operational"
    });
  };

  const handleAddCollection = () => {
    // This would open a modal or form to add a new collection
    addCollection({
      farmer: "New Farmer",
      location: "New Location",
      bags: 0,
      quality: "Grade A",
      agent: "Agent Name",
      date: "Today",
      status: "Collected"
    });
  };

  if (loading) {
    return (
      <Layout 
        title="Field Operations" 
        subtitle="Manage field agents, buying stations, and rural operations"
      >
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading field operations data...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                  <p className="text-2xl font-bold">{stats.activeAgents}</p>
                  <p className="text-xs text-green-600">{fieldAgents.length > 0 ? `${new Set(fieldAgents.map(a => a.region)).size} regions covered` : 'No regions yet'}</p>
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
                  <p className="text-2xl font-bold">{stats.totalStations}</p>
                  <p className="text-xs text-blue-600">{stats.totalStations > 0 ? `${Math.round((stats.operationalStations / stats.totalStations) * 100)}% operational` : 'No stations yet'}</p>
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
                  <p className="text-2xl font-bold">{stats.dailyCollections} bags</p>
                  <p className="text-xs text-purple-600">{collections.length > 0 ? 'Active collections' : 'No collections yet'}</p>
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
                  <p className="text-2xl font-bold">{stats.transportFleet}</p>
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
                <Button onClick={handleAddAgent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </div>
              {fieldAgents.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {fieldAgents.length === 0 ? (
                <EmptyFieldState type="agents" onAdd={handleAddAgent} />
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* Buying Stations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Buying Stations</CardTitle>
                  <CardDescription>Monitor station capacity and operations</CardDescription>
                </div>
                <Button onClick={handleAddStation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {buyingStations.length === 0 ? (
                <EmptyFieldState type="stations" onAdd={handleAddStation} />
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Collections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Collections</CardTitle>
                <CardDescription>Latest coffee collections from farmers</CardDescription>
              </div>
              <Button onClick={handleAddCollection}>
                <Plus className="h-4 w-4 mr-2" />
                Record Collection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {collections.length === 0 ? (
              <EmptyFieldState type="collections" onAdd={handleAddCollection} />
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FieldOperations;
