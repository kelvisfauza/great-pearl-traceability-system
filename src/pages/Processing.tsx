import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Coffee,
  Cog,
  TrendingUp,
  Clock,
  Play,
  Settings,
  Eye,
  CheckCircle,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { useProcessingOperations } from "@/hooks/useProcessingOperations";
import { useAuth } from "@/contexts/AuthContext";

const Processing = () => {
  const { processingBatches, machines, loading, todayMetrics } =
    useProcessingOperations();
  const { hasPermission } = useAuth();

  if (!hasPermission('Processing')) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Coffee className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access Processing Operations.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Processing Operations"
      subtitle="Monitor milling, sorting, and production processes"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Processed Today
                  </p>
                  <p className="text-2xl font-bold">
                    {todayMetrics?.processedBags ?? 0} bags
                  </p>
                  <p className="text-xs text-green-600">Real-time data</p>
                </div>
                <Coffee className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Machine Efficiency
                  </p>
                  <p className="text-2xl font-bold">
                    {todayMetrics?.averageEfficiency ?? 0}%
                  </p>
                  <p className="text-xs text-blue-600">
                    From {machines.length} machines
                  </p>
                </div>
                <Cog className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Output Rate</p>
                  <p className="text-2xl font-bold">
                    {todayMetrics?.outputRate ?? 0}%
                  </p>
                  <p className="text-xs text-amber-600">Average yield</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg Processing Time
                  </p>
                  <p className="text-2xl font-bold">
                    {todayMetrics?.averageProcessingTime?.toFixed(1) ?? 0} hrs
                  </p>
                  <p className="text-xs text-purple-600">Per batch</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="batches" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="batches">Processing Batches</TabsTrigger>
            <TabsTrigger value="machines">Machine Status</TabsTrigger>
            <TabsTrigger value="schedule">Production Schedule</TabsTrigger>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          </TabsList>

          {/* Processing Batches */}
          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Processing Batches</CardTitle>
                    <CardDescription>
                      Monitor current milling and sorting operations
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" /> Filter
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" /> Start Batch
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search batches..." className="pl-10" />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading processing batches...</p>
                  </div>
                ) : processingBatches.length === 0 ? (
                  <div className="text-center py-8">
                    <Coffee className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No active processing batches</p>
                    <p className="text-sm text-gray-400">
                      Start a new batch to begin processing
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Coffee Type</TableHead>
                        <TableHead>Input Weight</TableHead>
                        <TableHead>Output Weight</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Efficiency</TableHead>
                        <TableHead>Operator</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processingBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">
                            {batch.batchNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.coffeeType}</Badge>
                          </TableCell>
                          <TableCell>{batch.inputWeight} kg</TableCell>
                          <TableCell>{batch.outputWeight} kg</TableCell>
                          <TableCell>{batch.processingStage}</TableCell>
                          <TableCell>{batch.efficiency}%</TableCell>
                          <TableCell>{batch.operatorName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                batch.status === "Completed"
                                  ? "default"
                                  : batch.status === "In Progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Machine Status */}
          <TabsContent value="machines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Machine Status & Monitoring</CardTitle>
                <CardDescription>
                  Real-time status of processing equipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading machine status...</p>
                  </div>
                ) : machines.length === 0 ? (
                  <div className="text-center py-8">
                    <Cog className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No machines configured</p>
                    <p className="text-sm text-gray-400">
                      Add processing equipment to monitor status
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Efficiency</TableHead>
                        <TableHead>Current Batch</TableHead>
                        <TableHead>Last Maintenance</TableHead>
                        <TableHead>Next Maintenance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machines.map((machine) => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-medium">
                            {machine.machineName}
                          </TableCell>
                          <TableCell>{machine.type}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                machine.status === "Running"
                                  ? "default"
                                  : machine.status === "Idle"
                                  ? "secondary"
                                  : machine.status === "Maintenance"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {machine.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{machine.efficiency}%</TableCell>
                          <TableCell>{machine.currentBatch || "-"}</TableCell>
                          <TableCell>{machine.lastMaintenance}</TableCell>
                          <TableCell>{machine.nextMaintenance}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Schedule */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Schedule</CardTitle>
                <CardDescription>
                  Plan and track processing operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No scheduled operations</p>
                  <p className="text-sm">
                    Schedule processing batches to see them here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Metrics */}
          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processing Quality Metrics</CardTitle>
                <CardDescription>
                  Track quality outcomes from processing operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No quality data available</p>
                  <p className="text-sm">
                    Quality metrics will appear as batches are processed
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Processing;
